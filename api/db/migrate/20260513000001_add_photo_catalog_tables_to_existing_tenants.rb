# frozen_string_literal: true

class AddPhotoCatalogTablesToExistingTenants < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  def up
    Tenant.find_each do |tenant|
      TenantSwitcher.switch!(tenant.schema_name)
      connection.execute(TenantSchemaSql.catalog_photo_tables_sql)
      add_visual_columns
      relax_orders_for_catalog_links
      Rails.logger.info("[Migration] #{tenant.schema_name}: photo catalog tables provisioned")
    rescue => e
      Rails.logger.warn("[Migration] #{tenant.schema_name}: #{e.message}")
    ensure
      TenantSwitcher.reset! rescue nil
    end
  ensure
    TenantSwitcher.reset! rescue nil
  end

  def down
    Tenant.find_each do |tenant|
      TenantSwitcher.switch!(tenant.schema_name)
      %w[
        payments
        selection_items
        selections
        catalog_links
        catalog_items
        catalogs
        photo_analyses
        photos
        photo_batches
      ].each do |table|
        connection.execute("DROP TABLE IF EXISTS #{table} CASCADE")
      end
    rescue => e
      Rails.logger.warn("[Migration] #{tenant.schema_name}: #{e.message}")
    ensure
      TenantSwitcher.reset! rescue nil
    end
  ensure
    TenantSwitcher.reset! rescue nil
  end

  private

  def add_visual_columns
    connection.execute(<<~SQL)
      ALTER TABLE product_variants
        ADD COLUMN IF NOT EXISTS pantone VARCHAR(40),
        ADD COLUMN IF NOT EXISTS size_group VARCHAR(30);

      ALTER TABLE product_images
        ADD COLUMN IF NOT EXISTS photo_id BIGINT,
        ADD COLUMN IF NOT EXISTS visual_metadata JSONB NOT NULL DEFAULT '{}';

      CREATE INDEX IF NOT EXISTS idx_product_images_photo ON product_images (photo_id);
    SQL
  end

  def relax_orders_for_catalog_links
    connection.execute(<<~SQL)
      ALTER TABLE orders
        ALTER COLUMN member_id DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS catalog_link_id BIGINT REFERENCES catalog_links(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS buyer_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS buyer_phone VARCHAR(30),
        ADD COLUMN IF NOT EXISTS buyer_email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'not_required';

      CREATE INDEX IF NOT EXISTS idx_orders_catalog_link ON orders (catalog_link_id);
    SQL
  end
end
