# frozen_string_literal: true

class Lead < ApplicationRecord
  STATUS_VALUES = %w[new contacted converted discarded].freeze
  SOURCE_VALUES = %w[storefront whatsapp instagram other].freeze

  belongs_to :product, optional: true

  validates :status, inclusion: { in: STATUS_VALUES }
  validates :source, inclusion: { in: SOURCE_VALUES }
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true
  validate :contact_present

  scope :recent, -> { order(created_at: :desc) }
  scope :by_status, ->(s) { where(status: s) if s.present? }

  def new?
    status == "new"
  end

  private

  def contact_present
    errors.add(:base, "email or phone must be present") if email.blank? && phone.blank?
  end
end
