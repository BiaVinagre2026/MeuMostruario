# frozen_string_literal: true

class AddMadeInAndMinOrderQtyToProducts < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  def up
    Tenant.find_each do |tenant|
      TenantSwitcher.switch!(tenant.schema_name)
      table_exists = ActiveRecord::Base.connection.execute(
        "SELECT 1 FROM information_schema.tables
         WHERE table_schema = '#{ActiveRecord::Base.connection.quote_string(tenant.schema_name)}'
           AND table_name = 'products'"
      ).any?
      if table_exists
        ActiveRecord::Base.connection.execute(<<~SQL)
          ALTER TABLE products
            ADD COLUMN IF NOT EXISTS made_in VARCHAR(100),
            ADD COLUMN IF NOT EXISTS min_order_qty INTEGER DEFAULT 1;
        SQL
        Rails.logger.info "[Migration] #{tenant.schema_name}: made_in + min_order_qty adicionados"
      else
        Rails.logger.warn "[Migration] #{tenant.schema_name}: tabela products não encontrada, pulando"
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
      ActiveRecord::Base.connection.execute(<<~SQL)
        ALTER TABLE products
          DROP COLUMN IF EXISTS made_in,
          DROP COLUMN IF EXISTS min_order_qty;
      SQL
    rescue => e
      Rails.logger.warn "[Migration] #{tenant.schema_name}: #{e.message}"
    ensure
      TenantSwitcher.reset! rescue nil
    end
  end
end
