# frozen_string_literal: true

require "rails_helper"

RSpec.describe "GET /api/v1/looks", type: :request do
  let(:tenant) { provision_tenant(slug: "looks-req-#{SecureRandom.hex(3)}") }

  before { tenant }

  after do
    ActiveRecord::Base.connection.execute(
      "DROP SCHEMA IF EXISTS #{ActiveRecord::Base.connection.quote_column_name(tenant.schema_name)} CASCADE"
    )
  end

  describe "GET /api/v1/looks" do
    it "returns 200 with empty looks when none exist" do
      get "/api/v1/looks", headers: tenant_headers(tenant)

      expect(response).to have_http_status(:ok)
      expect(json["looks"]).to eq([])
    end

    it "returns only published looks" do
      with_tenant(tenant) do
        Look.create!(name: "Draft Look", status: "draft")
        Look.create!(name: "Published Look", status: "published")
      end

      get "/api/v1/looks", headers: tenant_headers(tenant)

      expect(json["looks"].size).to eq(1)
      expect(json["looks"][0]["name"]).to eq("Published Look")
    end

    it "returns look summary fields" do
      with_tenant(tenant) { Look.create!(name: "Summer Look", status: "published") }

      get "/api/v1/looks", headers: tenant_headers(tenant)

      look = json["looks"][0]
      expect(look.keys).to include("id", "slug", "name", "description", "cover_url",
                                   "status", "position", "product_count")
    end

    it "returns 404 when tenant is not found" do
      get "/api/v1/looks", headers: { "X-Tenant-ID" => "nonexistent-tenant" }
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "GET /api/v1/looks/:slug" do
    it "returns 404 for unknown slug" do
      get "/api/v1/looks/unknown-slug", headers: tenant_headers(tenant)
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 for draft look" do
      with_tenant(tenant) { Look.create!(name: "Draft", status: "draft") }

      get "/api/v1/looks/draft", headers: tenant_headers(tenant)
      expect(response).to have_http_status(:not_found)
    end

    it "returns look detail with products array" do
      with_tenant(tenant) do
        look = Look.create!(name: "My Look", status: "published")
        look
      end

      get "/api/v1/looks/my-look", headers: tenant_headers(tenant)

      expect(response).to have_http_status(:ok)
      expect(json["look"]["name"]).to eq("My Look")
      expect(json["look"]["products"]).to be_an(Array)
    end
  end

  describe "Tenant isolation" do
    let(:other_tenant) { provision_tenant(slug: "looks-other-#{SecureRandom.hex(3)}") }

    before { other_tenant }

    after do
      ActiveRecord::Base.connection.execute(
        "DROP SCHEMA IF EXISTS #{ActiveRecord::Base.connection.quote_column_name(other_tenant.schema_name)} CASCADE"
      )
    end

    it "does not return looks from a different tenant" do
      with_tenant(other_tenant) { Look.create!(name: "Rival Look", status: "published") }

      get "/api/v1/looks", headers: tenant_headers(tenant)

      expect(response).to have_http_status(:ok)
      expect(json["looks"]).to be_empty
    end
  end

  private

  def json
    JSON.parse(response.body)
  end
end
