# frozen_string_literal: true

# Adds metadata JSONB column to order_items in all existing tenant schemas.
# Also adds discount/pricing columns to orders via metadata on the order model.
# New tenants are covered by the updated TenantSchemaSql.
class AddMetadataToOrderItemsInTenants < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  def up
    Tenant.find_each do |tenant|
      TenantSwitcher.switch!(tenant.schema_name)

      conn = ActiveRecord::Base.connection
      schema_quoted = conn.quote_string(tenant.schema_name)

      order_items_exist = conn.execute(
        "SELECT 1 FROM information_schema.tables
         WHERE table_schema = '#{schema_quoted}' AND table_name = 'order_items'"
      ).any?

      unless order_items_exist
        Rails.logger.warn "[Migration] #{tenant.schema_name}: order_items não existe, pulando"
        next
      end

      conn.execute(<<~SQL)
        ALTER TABLE order_items
          ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
      SQL

      Rails.logger.info "[Migration] #{tenant.schema_name}: metadata adicionado em order_items"
    rescue => e
      Rails.logger.warn "[Migration] #{tenant.schema_name}: #{e.message}"
    ensure
      TenantSwitcher.reset! rescue nil
    end
  ensure
    TenantSwitcher.reset! rescue nil
  end

  def down
    Tenant.find_each do |tenant|
      TenantSwitcher.switch!(tenant.schema_name)
      ActiveRecord::Base.connection.execute(<<~SQL)
        ALTER TABLE order_items DROP COLUMN IF EXISTS metadata;
      SQL
    rescue => e
      Rails.logger.warn "[Migration] #{tenant.schema_name}: #{e.message}"
    ensure
      TenantSwitcher.reset! rescue nil
    end
  end
end
