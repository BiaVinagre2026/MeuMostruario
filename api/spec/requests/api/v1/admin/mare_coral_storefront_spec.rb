# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Admin::MareCoralStorefront", type: :request do
  # Slug aleatorio de proposito: o recurso e liberado pela capacidade
  # retail_storefront, nao pelo nome do tenant. Um slug fixo aqui faria este
  # spec colidir com qualquer outro que tambem precisasse criar "mare-coral".
  let!(:tenant) do
    provision_test_tenant(name: "Maré Coral").tap do |t|
      t.tenant_config.update!(enabled_features: ["retail_storefront"])
    end
  end
  let(:headers) { tenant_headers(tenant) }
  let!(:fixture) do
    create_catalog_fixture(
      tenant: tenant,
      link_type: "wholesale_buyer",
      show_prices: true,
      allow_order: true,
      allow_payment: false
    ).tap do |data|
      within_tenant(tenant) do
        data[:link].update!(metadata: { "retail_storefront" => { "enabled" => true } })
      end
    end
  end
  let!(:operator) do
    Operator.create!(
      name: "Admin Maré teste",
      email: "mare-storefront@example.com",
      password: "teste-seguro",
      role: "admin",
      status: "active",
      tenant: tenant
    )
  end

  before do
    post "/api/v1/admin/auth/login", params: { email: operator.email, password: "teste-seguro" }, headers: headers
    expect(response).to have_http_status(:ok)
  end

  it "lista apenas produtos publicados e informa se podem entrar na vitrine" do
    incomplete = within_tenant(tenant) do
      Product.create!(name: "Macaquinho Coral", slug: "macaquinho-coral", currency: "BRL", status: "published")
    end
    within_tenant(tenant) do
      Product.create!(name: "Rascunho", slug: "rascunho", currency: "BRL", status: "draft")
    end

    get "/api/v1/admin/mare_coral/storefront", headers: headers

    expect(response).to have_http_status(:ok)
    expect(json_response.dig("catalog", "id")).to eq(fixture[:catalog].id)
    expect(json_response["products"].map { |product| product["name"] }).not_to include("Rascunho")
    selected = json_response["products"].find { |product| product["id"] == fixture[:product].id }
    pending = json_response["products"].find { |product| product["id"] == incomplete.id }
    expect(selected).to include("selected" => true, "eligible" => true, "stock_qty" => 8)
    expect(pending).to include("selected" => false, "eligible" => false)
    expect(pending["eligibility_reasons"]).to include("Informe o preço de varejo", "Cadastre ao menos uma variação com estoque")
  end

  it "salva seleção e ordem, ocultando o que saiu sem apagar o item" do
    second = within_tenant(tenant) do
      Product.create!(
        name: "Top Coral", slug: "top-coral", price_retail: 129.9, currency: "BRL", status: "published"
      ).tap { |product| product.variants.create!(size: "P", color: "Coral", stock_qty: 4) }
    end

    patch "/api/v1/admin/mare_coral/storefront",
          params: { product_ids: [second.id, fixture[:product].id] }, headers: headers, as: :json

    expect(response).to have_http_status(:ok)
    expect(json_response["products"].select { |product| product["selected"] }.map { |product| product["id"] }).to eq([second.id, fixture[:product].id])
    within_tenant(tenant) do
      expect(fixture[:catalog].catalog_items.where(visible: true).pluck(:product_id, :position)).to eq([
        [second.id, 0], [fixture[:product].id, 1]
      ])
    end

    patch "/api/v1/admin/mare_coral/storefront",
          params: { product_ids: [second.id] }, headers: headers, as: :json
    expect(response).to have_http_status(:ok)
    within_tenant(tenant) do
      expect(fixture[:item].reload.visible).to be(false)
      expect(fixture[:catalog].catalog_items.where(visible: true).pluck(:product_id)).to eq([second.id])
    end
  end

  it "não publica produto sem preço ou estoque" do
    incomplete = within_tenant(tenant) do
      Product.create!(name: "Macaquinho sem grade", slug: "macaquinho-sem-grade", price_retail: 199.9, currency: "BRL", status: "published")
    end

    patch "/api/v1/admin/mare_coral/storefront",
          params: { product_ids: [incomplete.id] }, headers: headers, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(json_response["errors"].first).to include("complete preço e estoque")
    within_tenant(tenant) { expect(fixture[:item].reload.visible).to be(true) }
  end

  it "não abre o recurso em tenant sem a capacidade retail_storefront" do
    other = provision_test_tenant(slug: "outra-loja")
    other_operator = Operator.create!(name: "Outro admin", email: "outro-storefront@example.com", password: "teste-seguro", role: "admin", status: "active", tenant: other)
    delete "/api/v1/admin/auth/logout", headers: headers
    post "/api/v1/admin/auth/login", params: { email: other_operator.email, password: "teste-seguro" }, headers: tenant_headers(other)

    get "/api/v1/admin/mare_coral/storefront", headers: tenant_headers(other)

    expect(response).to have_http_status(:not_found)
  end

  it "abre para qualquer tenant com a capacidade, nao so para quem se chama mare-coral" do
    # A prova de que o portao e por capacidade: um tenant com nome qualquer,
    # sem nenhuma relacao com "mare-coral", entra desde que tenha a feature.
    outro_varejo = provision_test_tenant(name: "Outra Loja de Varejo").tap do |t|
      t.tenant_config.update!(enabled_features: ["retail_storefront"])
    end
    outro_fixture = create_catalog_fixture(
      tenant: outro_varejo, link_type: "wholesale_buyer",
      show_prices: true, allow_order: true, allow_payment: false
    ).tap { |data| within_tenant(outro_varejo) { data[:link].update!(metadata: { "retail_storefront" => { "enabled" => true } }) } }
    outro_operator = Operator.create!(name: "Admin varejo", email: "outro-varejo@example.com", password: "teste-seguro", role: "admin", status: "active", tenant: outro_varejo)
    delete "/api/v1/admin/auth/logout", headers: headers
    post "/api/v1/admin/auth/login", params: { email: outro_operator.email, password: "teste-seguro" }, headers: tenant_headers(outro_varejo)

    get "/api/v1/admin/mare_coral/storefront", headers: tenant_headers(outro_varejo)

    expect(response).to have_http_status(:ok)
    expect(json_response.dig("catalog", "id")).to eq(outro_fixture[:catalog].id)
  end
end
