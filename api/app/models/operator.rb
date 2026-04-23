# frozen_string_literal: true

# Operator - global admin users living in the public schema.
#
# Roles:
#   - super_admin: no tenant_id, can manage any tenant via X-Admin-Tenant-Slug header
#   - admin:       has tenant_id, scoped to that tenant only
class Operator < ApplicationRecord
  self.table_name = "public.operators"

  has_secure_password

  ROLE_VALUES   = %w[admin super_admin].freeze
  STATUS_VALUES = %w[active suspended].freeze

  belongs_to :tenant, optional: true

  validates :name,   presence: true
  validates :email,  presence: true,
                     uniqueness: { case_sensitive: false },
                     format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role,   inclusion: { in: ROLE_VALUES }
  validates :status, inclusion: { in: STATUS_VALUES }
  validate  :role_tenant_consistency

  before_save { self.email = email.downcase.strip }

  scope :active, -> { where(status: "active") }

  def active?    = status == "active"
  def super_admin? = role == "super_admin"
  def admin?     = role == "admin"

  private

  def role_tenant_consistency
    if role == "admin" && tenant_id.nil?
      errors.add(:tenant, "must be present for role 'admin'")
    end
    if role == "super_admin" && tenant_id.present?
      errors.add(:tenant, "must be blank for role 'super_admin'")
    end
  end
end
