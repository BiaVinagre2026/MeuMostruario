# frozen_string_literal: true

# Provisions orders and order_items tables in all existing tenant schemas.
# New tenants are handled automatically by TenantProvisioner which calls
# TenantSchemaSql.tables_sql (which now includes these tables).
class AddOrdersTablesToExistingTenants < ActiveRecord::Migration[7.2]
  def up
    Tenant.find_each do |tenant|
      ActiveRecord::Base.transaction do
        TenantSwitcher.switch!(tenant.schema_name)
        ActiveRecord::Base.connection.execute(TenantSchemaSql.orders_tables_sql)
        Rails.logger.info("Provisioned orders tables in schema: #{tenant.schema_name}")
      end
    ensure
      TenantSwitcher.reset!
    end
  end

  def down
    Tenant.find_each do |tenant|
      ActiveRecord::Base.transaction do
        TenantSwitcher.switch!(tenant.schema_name)
        %w[order_items orders].each do |table|
          ActiveRecord::Base.connection.execute("DROP TABLE IF EXISTS #{table} CASCADE")
        end
      end
    ensure
      TenantSwitcher.reset!
    end
  end
end
