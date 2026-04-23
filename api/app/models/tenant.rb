class Tenant < ApplicationRecord
  has_one :tenant_config, dependent: :destroy

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true, format: { with: /\A[a-z0-9\-]+\z/ }
  validates :schema_name, presence: true, uniqueness: true
  validates :plan, inclusion: { in: %w[starter growth enterprise] }
  validates :status, inclusion: { in: %w[active suspended cancelled] }

  before_validation :set_schema_name, on: :create

  scope :active, -> { where(status: "active") }

  def active?
    status == "active"
  end

  private

  def set_schema_name
    self.schema_name = "tenant_#{slug}" if slug.present? && schema_name.blank?
  end
end
