# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Orders API", type: :request do
  let(:tenant) { provision_tenant(slug: "orders-req-#{SecureRandom.hex(3)}") }

  before { tenant }

  after do
    ActiveRecord::Base.connection.execute(
      "DROP SCHEMA IF EXISTS #{ActiveRecord::Base.connection.quote_column_name(tenant.schema_name)} CASCADE"
    )
  end

  def auth_token_for(member_id)
    JwtService.encode({ "member_id" => member_id })
  end

  def authed_headers(tenant, member_id: 1)
    tenant_headers(tenant).merge("Authorization" => "Bearer #{auth_token_for(member_id)}")
  end

  describe "GET /api/v1/orders" do
    it "returns 401 without auth" do
      get "/api/v1/orders", headers: tenant_headers(tenant)
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 when member does not exist" do
      get "/api/v1/orders", headers: authed_headers(tenant, member_id: 999_999)
      expect(response).to have_http_status(:unauthorized)
    end

    context "with a valid member" do
      let(:member_id) { 1 }

      before do
        with_tenant(tenant) do
          ActiveRecord::Base.connection.execute(<<~SQL)
            INSERT INTO members (id, cpf, full_name, email, password_digest, status, plan_status, role)
            VALUES (#{member_id}, '12345678901', 'Test Member', 'member@test.com', 'x', 'active', 'active', 'member')
          SQL
        end
      end

      it "returns 200 with empty orders" do
        get "/api/v1/orders", headers: authed_headers(tenant, member_id: member_id)
        expect(response).to have_http_status(:ok)
        expect(json["orders"]).to eq([])
      end

      it "returns only the member's own orders" do
        with_tenant(tenant) do
          Order.create!(member_id: member_id, status: "pending", total_units: 1, total_value: 50)
          Order.create!(member_id: 999,        status: "pending", total_units: 1, total_value: 50)
        end

        get "/api/v1/orders", headers: authed_headers(tenant, member_id: member_id)

        expect(json["orders"].size).to eq(1)
      end

      it "returns pagination meta" do
        get "/api/v1/orders", headers: authed_headers(tenant, member_id: member_id)

        expect(json["meta"].keys).to include("current_page", "total_pages", "total_count", "per_page")
      end
    end
  end

  describe "POST /api/v1/orders" do
    let(:member_id) { 2 }

    before do
      with_tenant(tenant) do
        ActiveRecord::Base.connection.execute(<<~SQL)
          INSERT INTO members (id, cpf, full_name, email, password_digest, status, plan_status, role)
          VALUES (#{member_id}, '98765432100', 'Buyer', 'buyer@test.com', 'x', 'active', 'active', 'member')
        SQL
      end
    end

    let(:valid_order_params) do
      {
        order: {
          notes: "Entrega rápida",
          subtotal: 179.80,
          total: 179.80,
          items: [
            {
              product_name: "Calça Slim",
              product_sku: "CAL-001",
              color: "Preto",
              size: "M",
              qty: 2,
              unit_price: 89.90
            }
          ]
        }
      }
    end

    it "creates an order and returns 201" do
      post "/api/v1/orders",
           params: valid_order_params,
           headers: authed_headers(tenant, member_id: member_id)

      expect(response).to have_http_status(:created)
      expect(json["order"]["status"]).to eq("pending")
    end

    it "returns 422 when items is empty" do
      post "/api/v1/orders",
           params: { order: { items: [] } },
           headers: authed_headers(tenant, member_id: member_id)

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 401 without authentication" do
      post "/api/v1/orders",
           params: valid_order_params,
           headers: tenant_headers(tenant)

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "Tenant isolation" do
    let(:other_tenant) { provision_tenant(slug: "orders-other-#{SecureRandom.hex(3)}") }

    before { other_tenant }

    after do
      ActiveRecord::Base.connection.execute(
        "DROP SCHEMA IF EXISTS #{ActiveRecord::Base.connection.quote_column_name(other_tenant.schema_name)} CASCADE"
      )
    end

    it "order created in tenant_a is not visible in tenant_b" do
      with_tenant(tenant) do
        Order.create!(member_id: 1, status: "pending", total_units: 1, total_value: 100)
      end

      with_tenant(other_tenant) do
        expect(Order.count).to eq(0)
      end
    end
  end

  private

  def json
    JSON.parse(response.body)
  end
end
