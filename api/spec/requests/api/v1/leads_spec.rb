# frozen_string_literal: true

require "rails_helper"

RSpec.describe "POST /api/v1/leads", type: :request do
  let(:tenant) { provision_tenant(slug: "leads-req-#{SecureRandom.hex(3)}") }

  before { tenant }

  after do
    ActiveRecord::Base.connection.execute(
      "DROP SCHEMA IF EXISTS #{ActiveRecord::Base.connection.quote_column_name(tenant.schema_name)} CASCADE"
    )
  end

  describe "POST /api/v1/leads" do
    let(:valid_params) do
      { lead: { email: "buyer@test.com", message: "Quero comprar", source: "storefront" } }
    end

    it "creates a lead and returns 201" do
      post "/api/v1/leads", params: valid_params, headers: tenant_headers(tenant)

      expect(response).to have_http_status(:created)
      expect(json["message"]).to be_present
    end

    it "creates the lead record in the tenant schema" do
      post "/api/v1/leads", params: valid_params, headers: tenant_headers(tenant)

      with_tenant(tenant) do
        expect(Lead.count).to eq(1)
        expect(Lead.first.email).to eq("buyer@test.com")
      end
    end

    it "defaults source to storefront when not provided" do
      post "/api/v1/leads",
           params: { lead: { email: "x@test.com" } },
           headers: tenant_headers(tenant)

      with_tenant(tenant) do
        expect(Lead.first.source).to eq("storefront")
      end
    end

    it "maps notes to message field" do
      post "/api/v1/leads",
           params: { lead: { phone: "11999990001", notes: "Pedido via WhatsApp" } },
           headers: tenant_headers(tenant)

      with_tenant(tenant) do
        expect(Lead.first.message).to eq("Pedido via WhatsApp")
      end
    end

    it "stores B2B company fields in metadata" do
      post "/api/v1/leads",
           params: {
             lead: {
               email: "loja@cnpj.com",
               company_name: "Boutique LTDA",
               cnpj: "12345678000199",
               source: "storefront"
             }
           },
           headers: tenant_headers(tenant)

      with_tenant(tenant) do
        lead = Lead.first
        expect(lead.metadata["company_name"]).to eq("Boutique LTDA")
        expect(lead.metadata["cnpj"]).to eq("12345678000199")
      end
    end

    it "returns 422 when neither email nor phone is provided" do
      post "/api/v1/leads",
           params: { lead: { message: "Olá", source: "storefront" } },
           headers: tenant_headers(tenant)

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 404 when tenant is not found" do
      post "/api/v1/leads",
           params: valid_params,
           headers: { "X-Tenant-ID" => "ghost-tenant" }

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "Tenant isolation" do
    let(:other_tenant) { provision_tenant(slug: "leads-other-#{SecureRandom.hex(3)}") }

    before { other_tenant }

    after do
      ActiveRecord::Base.connection.execute(
        "DROP SCHEMA IF EXISTS #{ActiveRecord::Base.connection.quote_column_name(other_tenant.schema_name)} CASCADE"
      )
    end

    it "lead submitted to tenant_a is not visible in tenant_b schema" do
      post "/api/v1/leads",
           params: { lead: { email: "buyer@test.com", source: "storefront" } },
           headers: tenant_headers(tenant)

      with_tenant(other_tenant) do
        expect(Lead.count).to eq(0)
      end
    end
  end

  private

  def json
    JSON.parse(response.body)
  end
end
