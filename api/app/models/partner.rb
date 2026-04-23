# frozen_string_literal: true

class Partner < ApplicationRecord
  self.table_name = "public.partners"

  has_secure_password

  STATUSES = %w[pending_approval active inactive suspended rejected].freeze
  DOCUMENT_TYPES = %w[cpf cnpj].freeze

  has_many :bank_accounts, class_name: "PartnerBankAccount", dependent: :destroy
  has_many :catalog_items, class_name: "PartnerCatalogItem", dependent: :destroy
  has_many :tenant_partner_authorizations, class_name: "TenantPartnerAuthorization", dependent: :destroy
  has_many :tenants, through: :tenant_partner_authorizations
  belongs_to :approver, class_name: "Operator", foreign_key: :approved_by, optional: true

  validates :name, presence: true
  validates :email, presence: true, uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :document_type, inclusion: { in: DOCUMENT_TYPES }
  validates :status, inclusion: { in: STATUSES }
  validates :default_commission_percent,
            numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 },
            allow_nil: true

  before_save { self.email = email.downcase.strip }

  scope :active, -> { where(status: "active") }
  scope :pending_approval, -> { where(status: "pending_approval") }
  scope :by_status, ->(s) { where(status: s) if s.present? }

  def active?       = status == "active"
  def pending_approval? = status == "pending_approval"
  def suspended?    = status == "suspended"
  def rejected?     = status == "rejected"
  def inactive?     = status == "inactive"

  def primary_bank_account
    bank_accounts.find_by(is_primary: true, status: "active")
  end

  def generate_api_key!
    update!(api_key: "pk_live_#{SecureRandom.alphanumeric(24)}")
  end

  def authorized_for_tenant?(tenant)
    tenant_partner_authorizations.exists?(tenant_id: tenant.id, status: "active")
  end
end
