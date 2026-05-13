# frozen_string_literal: true

class CatalogLink < ApplicationRecord
  LINK_TYPES = %w[public_client wholesale_buyer selection].freeze

  belongs_to :catalog
  belongs_to :parent_catalog_link, class_name: "CatalogLink", optional: true
  has_many :child_catalog_links, class_name: "CatalogLink", foreign_key: :parent_catalog_link_id, dependent: :nullify
  has_many :selections, dependent: :nullify
  has_many :orders, dependent: :nullify

  before_validation :ensure_token
  before_validation :enforce_public_rules

  validates :token, presence: true, uniqueness: true
  validates :link_type, inclusion: { in: LINK_TYPES }

  scope :active, -> { where("expires_at IS NULL OR expires_at > ?", Time.current) }

  def public_client?
    link_type == "public_client"
  end

  def wholesale_buyer?
    link_type == "wholesale_buyer"
  end

  def expired?
    expires_at.present? && expires_at <= Time.current
  end

  private

  def ensure_token
    self.token = SecureRandom.urlsafe_base64(24) if token.blank?
  end

  def enforce_public_rules
    return unless public_client?
    self.show_prices = false
    self.allow_order = false
    self.allow_payment = false
  end
end
