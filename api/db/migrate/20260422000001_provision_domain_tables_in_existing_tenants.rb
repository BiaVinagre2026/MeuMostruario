# frozen_string_literal: true

# Provisions catalog domain tables (categories, collections, products, variants,
# images, looks, look_items, leads, waitlists) in all existing tenant schemas.
# New tenants are handled by TenantProvisioner which already calls
# TenantSchemaSql.tables_sql (which now includes these tables).
class ProvisionDomainTablesInExistingTenants < ActiveRecord::Migration[7.2]
  def up
    Tenant.find_each do |tenant|
      ActiveRecord::Base.transaction do
        TenantSwitcher.switch!(tenant.schema_name)
        ActiveRecord::Base.connection.execute(TenantSchemaSql.domain_tables_sql)
        Rails.logger.info("Provisioned domain tables in schema: #{tenant.schema_name}")
      end
    ensure
      TenantSwitcher.reset!
    end
  end

  def down
    Tenant.find_each do |tenant|
      ActiveRecord::Base.transaction do
        TenantSwitcher.switch!(tenant.schema_name)
        %w[
          waitlists leads look_items looks
          product_images product_variants products
          collections categories
        ].each do |table|
          ActiveRecord::Base.connection.execute("DROP TABLE IF EXISTS #{table} CASCADE")
        end
      end
    ensure
      TenantSwitcher.reset!
    end
  end
end
