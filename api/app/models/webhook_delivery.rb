# frozen_string_literal: true

class WebhookDelivery < ApplicationRecord
  belongs_to :webhook_endpoint

  validates :event, presence: true
  validates :payload, presence: true

  scope :recent, -> { order(created_at: :desc) }

  def delivered?
    delivered_at.present?
  end

  def success?
    response_code.present? && response_code >= 200 && response_code < 300
  end
end
