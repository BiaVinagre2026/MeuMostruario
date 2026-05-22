# frozen_string_literal: true

module TenantSpecHelper
  def provision_test_tenant(slug: nil, name: "Fabrica Teste")
    slug ||= "spec-#{SecureRandom.hex(4)}"
    tenant = Tenant.create!(
      name: name,
      slug: slug,
      schema_name: "tenant_#{slug.tr('-', '_')}",
      plan: "starter",
      status: "active"
    )

    TenantConfig.create!(
      tenant: tenant,
      coin_name: "Coins",
      color_primary: "#111111",
      color_secondary: "#222222",
      color_accent: "#333333"
    )

    provision_test_schema!(tenant)
    tenant
  end

  def within_tenant(tenant, &block)
    TenantSwitcher.switch(tenant, &block)
  end

  def tenant_headers(tenant, extra = {})
    { "X-Tenant-ID" => tenant.slug }.merge(extra)
  end

  def create_catalog_fixture(tenant:, link_type:, show_prices:, allow_order:, allow_payment:)
    within_tenant(tenant) do
      product = Product.create!(
        name: "Maio Canelado",
        slug: "maio-canelado-#{SecureRandom.hex(3)}",
        description: "Modelo demo",
        price_wholesale: 149.9,
        price_retail: 219.9,
        currency: "BRL",
        sku: "MAIO-001",
        status: "published"
      )

      product.variants.create!(
        size: "M",
        color: "Azul",
        pantone: "19-4052 TPX",
        size_group: "M/G",
        stock_qty: 8
      )

      batch = PhotoBatch.create!(name: "Lote Demo", status: "review")
      photo = batch.photos.create!(
        original_filename: "vestido_azul.jpg",
        status: "approved",
        approved_color: "Azul",
        approved_pantone: "19-4052 TPX",
        approved_model: "Maio Canelado",
        approved_size_group: "M/G",
        urls: {
          "original" => "https://cdn.example.com/maio-001.jpg",
          "thumb" => "https://cdn.example.com/maio-001-thumb.jpg"
        },
        product: product
      )

      catalog = Catalog.create!(
        name: "Catalogo Atacado",
        description: "Colecao principal",
        status: "published",
        source: "admin"
      )

      item = catalog.catalog_items.create!(
        product: product,
        photo: photo,
        position: 0,
        visible: true
      )

      link = catalog.catalog_links.create!(
        link_type: link_type,
        show_prices: show_prices,
        allow_order: allow_order,
        allow_payment: allow_payment
      )

      {
        product: product,
        photo: photo,
        catalog: catalog,
        item: item,
        link: link
      }
    end
  end

  def json_response
    JSON.parse(response.body)
  end

  private

  def provision_test_schema!(tenant)
    connection = ActiveRecord::Base.connection
    connection.execute("CREATE SCHEMA IF NOT EXISTS #{connection.quote_column_name(tenant.schema_name)}")

    TenantSwitcher.switch!(tenant.schema_name)
    connection.execute(test_schema_sql)
  ensure
    TenantSwitcher.reset! rescue nil
  end

  def test_schema_sql
    TenantSchemaSql.tables_sql
      .gsub(/^\s*CREATE EXTENSION IF NOT EXISTS pg_trgm;\n/, "")
      .gsub(/^\s*CREATE INDEX IF NOT EXISTS idx_products_name_trgm.*\n/, "")
      .gsub(/^\s*CREATE INDEX IF NOT EXISTS idx_products_description_trgm.*\n/, "")
  end
end

RSpec.configure do |config|
  config.include TenantSpecHelper
end
