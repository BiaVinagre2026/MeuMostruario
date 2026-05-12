# frozen_string_literal: true

require "rails_helper"

RSpec.describe "GET /api/v1/products", type: :request do
  let(:tenant) { provision_tenant(slug: "prods-req-#{SecureRandom.hex(3)}") }

  before { tenant }

  after do
    ActiveRecord::Base.connection.execute(
      "DROP SCHEMA IF EXISTS #{ActiveRecord::Base.connection.quote_column_name(tenant.schema_name)} CASCADE"
    )
  end

  describe "GET /api/v1/products" do
    it "returns 200 with empty list" do
      get "/api/v1/products", headers: tenant_headers(tenant)

      expect(response).to have_http_status(:ok)
      expect(json["products"]).to eq([])
    end

    it "returns only published products" do
      with_tenant(tenant) do
        Product.create!(name: "Draft Item",     status: "draft",     currency: "BRL")
        Product.create!(name: "Published Item", status: "published", currency: "BRL")
      end

      get "/api/v1/products", headers: tenant_headers(tenant)

      expect(json["products"].size).to eq(1)
      expect(json["products"][0]["name"]).to eq("Published Item")
    end

    it "returns pagination meta" do
      get "/api/v1/products", headers: tenant_headers(tenant)

      expect(json["meta"].keys).to include("current_page", "total_pages", "total_count", "per_page")
    end

    it "filters by collection_id" do
      with_tenant(tenant) do
        col = Collection.create!(name: "Verão", status: "published")
        Product.create!(name: "Produto Coleção", status: "published", currency: "BRL", collection_id: col.id)
        Product.create!(name: "Sem Coleção",     status: "published", currency: "BRL")
      end

      with_tenant(tenant) do
        col = Collection.find_by!(name: "Verão")
        get "/api/v1/products",
            params: { collection_id: col.id },
            headers: tenant_headers(tenant)
      end

      expect(json["products"].size).to eq(1)
      expect(json["products"][0]["name"]).to eq("Produto Coleção")
    end

    it "returns 404 for unknown tenant" do
      get "/api/v1/products", headers: { "X-Tenant-ID" => "no-such-tenant" }
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "GET /api/v1/products/:slug" do
    it "returns 404 for unknown slug" do
      get "/api/v1/products/no-such-product", headers: tenant_headers(tenant)
      expect(response).to have_http_status(:not_found)
    end

    it "returns product detail" do
      with_tenant(tenant) do
        Product.create!(name: "Calça Slim", status: "published", currency: "BRL",
                        price_wholesale: 79.90, price_retail: 159.90)
      end

      get "/api/v1/products/calca-slim", headers: tenant_headers(tenant)

      expect(response).to have_http_status(:ok)
      p = json["product"]
      expect(p["name"]).to eq("Calça Slim")
      expect(p.keys).to include("slug", "price_wholesale", "price_retail", "images", "variants")
    end
  end

  describe "Tenant isolation" do
    let(:other_tenant) { provision_tenant(slug: "prods-other-#{SecureRandom.hex(3)}") }

    before { other_tenant }

    after do
      ActiveRecord::Base.connection.execute(
        "DROP SCHEMA IF EXISTS #{ActiveRecord::Base.connection.quote_column_name(other_tenant.schema_name)} CASCADE"
      )
    end

    it "product created in tenant_a is not returned for tenant_b" do
      with_tenant(other_tenant) do
        Product.create!(name: "Private Product", status: "published", currency: "BRL")
      end

      get "/api/v1/products", headers: tenant_headers(tenant)

      expect(json["products"]).to be_empty
    end
  end

  private

  def json
    JSON.parse(response.body)
  end
end
