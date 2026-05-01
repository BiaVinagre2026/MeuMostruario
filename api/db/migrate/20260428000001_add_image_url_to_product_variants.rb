# frozen_string_literal: true

class AddImageUrlToProductVariants < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  def up
    Tenant.find_each do |tenant|
      TenantSwitcher.switch!(tenant.schema_name)
      table_exists = ActiveRecord::Base.connection.execute(
        "SELECT 1 FROM information_schema.tables
         WHERE table_schema = '#{ActiveRecord::Base.connection.quote_string(tenant.schema_name)}'
           AND table_name = 'product_variants'"
      ).any?
      if table_exists
        ActiveRecord::Base.connection.execute(
          "ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)"
        )
      else
        Rails.logger.warn "[Migration] #{tenant.schema_name}: product_variants não existe, pulando"
      end
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
      ActiveRecord::Base.connection.execute(
        "ALTER TABLE product_variants DROP COLUMN IF EXISTS image_url"
      )
    rescue => e
      Rails.logger.warn "[Migration] #{tenant.schema_name}: #{e.message}"
    ensure
      TenantSwitcher.reset! rescue nil
    end
  end
end
