# frozen_string_literal: true

module TenantHelpers
  def provision_tenant(slug:, name: nil)
    tenant = Tenant.create!(
      name:   name || "Test #{slug.capitalize}",
      slug:   slug,
      plan:   "starter",
      status: "active"
    )
    TenantProvisioner.provision!(tenant)
    tenant
  end

  def with_tenant(tenant)
    TenantSwitcher.switch!(tenant.schema_name)
    yield
  ensure
    TenantSwitcher.reset!
  end

  def tenant_headers(tenant)
    { "X-Tenant-ID" => tenant.slug }
  end
end

RSpec.configure do |config|
  config.include TenantHelpers
end
