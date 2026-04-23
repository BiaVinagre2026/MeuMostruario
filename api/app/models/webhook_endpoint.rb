# frozen_string_literal: true

class WebhookEndpoint < ApplicationRecord
  has_many :deliveries, class_name: "WebhookDelivery", dependent: :destroy

  validates :url, presence: true, format: { with: URI::DEFAULT_PARSER.make_regexp(%w[http https]) }

  before_create :generate_secret

  scope :active, -> { where(active: true) }

  def subscribed_to?(event)
    events.include?(event) || events.include?("*")
  end

  private

  def generate_secret
    self.secret ||= SecureRandom.hex(32)
  end
end
