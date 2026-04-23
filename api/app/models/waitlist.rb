# frozen_string_literal: true

class Waitlist < ApplicationRecord
  belongs_to :collection, optional: true
  belongs_to :product, optional: true

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validate :target_present
  validates :email, uniqueness: { scope: :collection_id }, if: -> { collection_id.present? }
  validates :email, uniqueness: { scope: :product_id }, if: -> { product_id.present? }

  scope :pending_notification, -> { where(notified_at: nil) }

  def notified?
    notified_at.present?
  end

  private

  def target_present
    errors.add(:base, "collection or product must be present") if collection_id.blank? && product_id.blank?
  end
end
