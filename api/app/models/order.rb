# frozen_string_literal: true

class Order < ApplicationRecord
  STATUS_VALUES = %w[pending confirmed processing shipped cancelled].freeze
  PAYMENT_STATUS_VALUES = %w[not_required pending paid failed cancelled].freeze

  belongs_to :member, optional: true
  belongs_to :catalog_link, optional: true
  has_many :order_items, dependent: :destroy
  has_many :payments, dependent: :destroy

  validates :status, inclusion: { in: STATUS_VALUES }
  validates :payment_status, inclusion: { in: PAYMENT_STATUS_VALUES }
  validate :member_or_buyer_present

  default_scope { order(created_at: :desc) }

  scope :for_member, ->(id) { where(member_id: id) }

  def recalculate_totals!
    totals = order_items.pluck(:qty, :subtotal)
    self.total_units = totals.sum { |qty, _| qty.to_i }
    self.total_value = totals.sum { |_, sub| sub.to_d }
    save!
  end

  private

  def member_or_buyer_present
    return if member_id.present? || buyer_name.present? || buyer_phone.present? || buyer_email.present?
    errors.add(:base, "comprador deve ser informado")
  end
end
