# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Troca de tenant no super-admin", type: :request do
  let!(:tenant_a) { provision_test_tenant(name: "Cliente Alfa") }
  let!(:tenant_b) { provision_test_tenant(name: "Cliente Beta") }
  let!(:super_admin) do
    Operator.create!(
      name: "Super Admin Spec",
      email: "super-#{SecureRandom.hex(4)}@example.com",
      password: "password123",
      role: "super_admin",
      status: "active"
    )
  end

  before do
    within_tenant(tenant_a) do
      Product.create!(
        name: "Produto Alfa",
        slug: "produto-alfa",
        currency: "BRL",
        status: "published"
      )
    end

    within_tenant(tenant_b) do
      Product.create!(
        name: "Produto Beta",
        slug: "produto-beta",
        currency: "BRL",
        status: "published"
      )
    end
  end

  def login_operator(operator, headers: {})
    post "/api/v1/admin/auth/login",
         params: { email: operator.email, password: "password123" },
         headers: headers
    expect(response).to have_http_status(:ok)
  end

  it "permite ao super-admin consultar cada operacao sem misturar dados" do
    login_operator(super_admin)

    get "/api/v1/admin/products", headers: { "X-Admin-Tenant-Slug" => tenant_a.slug }
    expect(response).to have_http_status(:ok)
    expect(json_response.fetch("products").map { |product| product.fetch("name") }).to eq(["Produto Alfa"])

    get "/api/v1/admin/products", headers: { "X-Admin-Tenant-Slug" => tenant_b.slug }
    expect(response).to have_http_status(:ok)
    expect(json_response.fetch("products").map { |product| product.fetch("name") }).to eq(["Produto Beta"])
  end

  it "nao cai no tenant padrao quando o slug administrativo e invalido" do
    login_operator(super_admin)

    get "/api/v1/admin/products", headers: { "X-Admin-Tenant-Slug" => "cliente-inexistente" }

    expect(response).to have_http_status(:not_found)
    expect(json_response.fetch("error")).to eq("Tenant not found")
  end

  it "impede que um admin de tenant troque para outro cliente" do
    tenant_admin = Operator.create!(
      name: "Admin Alfa",
      email: "admin-alfa-#{SecureRandom.hex(4)}@example.com",
      password: "password123",
      role: "admin",
      status: "active",
      tenant: tenant_a
    )
    login_operator(tenant_admin, headers: tenant_headers(tenant_a))

    get "/api/v1/admin/products", headers: { "X-Admin-Tenant-Slug" => tenant_b.slug }

    expect(response).to have_http_status(:forbidden)
  end
end

