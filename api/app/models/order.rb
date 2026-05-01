# frozen_string_literal: true

class Order < ApplicationRecord
  STATUS_VALUES = %w[pending confirmed processing shipped cancelled].freeze

  belongs_to :member, optional: true
  has_many :order_items, dependent: :destroy

  validates :member_id, presence: true
  validates :status, inclusion: { in: STATUS_VALUES }

  default_scope { order(created_at: :desc) }

  scope :for_member, ->(id) { where(member_id: id) }

  def recalculate_totals!
    totals = order_items.pluck(:qty, :subtotal)
    self.total_units = totals.sum { |qty, _| qty.to_i }
    self.total_value = totals.sum { |_, sub| sub.to_d }
    save!
  end
end
