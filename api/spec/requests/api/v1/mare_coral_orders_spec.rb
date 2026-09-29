# frozen_string_literal: true

require "rails_helper"
require "webmock/rspec"

RSpec.describe "Api::V1::MareCoralOrders", type: :request do
  let!(:tenant) { provision_test_tenant(slug: "mare-coral", name: "Maré Coral") }
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
        data[:link].update!(metadata: {
          "retail_storefront" => {
            "enabled" => true,
            "shipping" => {
              "enabled" => true,
              "flat_rate" => "24.90",
              "free_shipping_threshold" => "500.00",
              "estimated_days" => 6
            }
          }
        })
      end
    end
  end

  def variant
    within_tenant(tenant) { fixture[:product].variants.first }
  end

  def order_params(qty: 2, catalog_item_id: fixture[:item].id, variant_id: variant.id, overrides: {})
    {
      order: {
        buyer_name: "Bia Vinagre",
        buyer_email: "bia@example.com",
        buyer_phone: "21999990000",
        shipping_address: {
          postal_code: "24340-000",
          street: "Rua das Ondas",
          number: "42",
          complement: "Casa",
          neighborhood: "Oceânica",
          city: "Niterói",
          state: "RJ"
        },
        items: [{
          catalog_item_id: catalog_item_id,
          variant_id: variant_id,
          qty: qty,
          unit_price: 1
        }]
      }.merge(overrides)
    }
  end

  it "calcula o frete com subtotal obtido do banco" do
    post "/api/v1/mare_coral/storefront/#{fixture[:link].token}/shipping_quote",
         params: { postal_code: "24340-000", order: { items: order_params.dig(:order, :items) } },
         headers: headers

    expect(response).to have_http_status(:ok)
    expect(json_response.dig("quote", "subtotal").to_d).to eq(439.8.to_d)
    expect(json_response.dig("quote", "amount").to_d).to eq(24.9.to_d)
    expect(json_response.dig("quote", "estimated_days")).to eq(6)
  end

  it "cria pedido varejista, salva endereco estruturado e reserva estoque" do
    post "/api/v1/mare_coral/storefront/#{fixture[:link].token}/orders",
         params: order_params,
         headers: headers

    expect(response).to have_http_status(:created)
    expect(json_response.dig("order", "total_value").to_d).to eq(464.7.to_d)
    expect(json_response.dig("order", "inventory_state")).to eq("reserved")

    within_tenant(tenant) do
      order = Order.order(:id).last
      expect(order.metadata.dig("shipping_address", "city")).to eq("Niterói")
      expect(order.metadata.dig("shipping", "amount").to_d).to eq(24.9.to_d)
      expect(order.order_items.first.unit_price.to_d).to eq(219.9.to_d)
      expect(order.order_items.first.metadata["variant_id"]).to eq(variant.id)
      expect(variant.reload.stock_qty).to eq(6)
    end
  end

  it "recusa falta de estoque sem criar pedido nem alterar unidades" do
    post "/api/v1/mare_coral/storefront/#{fixture[:link].token}/orders",
         params: order_params(qty: 9),
         headers: headers

    expect(response).to have_http_status(:unprocessable_entity)
    expect(json_response["errors"].first).to include("estoque insuficiente")
    within_tenant(tenant) do
      expect(Order.count).to eq(0)
      expect(variant.reload.stock_qty).to eq(8)
    end
  end

  it "recusa item de outro catalogo" do
    outsider = create_catalog_fixture(
      tenant: tenant,
      link_type: "wholesale_buyer",
      show_prices: true,
      allow_order: true,
      allow_payment: false
    )
    outsider_variant_id = within_tenant(tenant) { outsider[:product].variants.first.id }

    post "/api/v1/mare_coral/storefront/#{fixture[:link].token}/orders",
         params: order_params(catalog_item_id: outsider[:item].id, variant_id: outsider_variant_id),
         headers: headers

    expect(response).to have_http_status(:unprocessable_entity)
    expect(json_response["errors"]).to include("item nao pertence a vitrine da Mare Coral")
  end

  it "nao permite pagamento sem credenciais do gateway" do
    within_tenant(tenant) { fixture[:link].update!(allow_payment: true) }

    post "/api/v1/mare_coral/storefront/#{fixture[:link].token}/orders",
         params: order_params(overrides: { buyer_document: "529.982.247-25" }),
         headers: headers

    expect(response).to have_http_status(:unprocessable_entity)
    expect(json_response["errors"]).to include("configure as credenciais do gateway antes de ativar o pagamento")
    within_tenant(tenant) { expect(Order.count).to eq(0) }
  end

  it "recusa o endpoint em outro tenant" do
    other_tenant = provision_test_tenant(slug: "outra-loja")

    post "/api/v1/mare_coral/storefront/#{fixture[:link].token}/orders",
         params: order_params,
         headers: tenant_headers(other_tenant)

    expect(response).to have_http_status(:not_found)
  end

  describe "configuração exclusiva de entrega" do
    let!(:operator) { Operator.create!(name: "Admin Maré teste", email: "mare-test@example.com", password: "teste-seguro", role: "admin", status: "active", tenant: tenant) }

    before do
      post "/api/v1/admin/auth/login", params: { email: operator.email, password: "teste-seguro" }, headers: headers
      expect(response).to have_http_status(:ok)
    end

    it "salva a política aprovada sem inventar tarifa ou prazo" do
      patch "/api/v1/admin/mare_coral/retail_settings", params: {
        enabled: true, origin_postal_code: "24340-140", free_shipping_threshold: "200,00", flat_rate: nil, estimated_days: nil
      }, headers: headers, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_response).to include("enabled" => true, "origin_postal_code" => "24340140", "free_shipping_threshold" => "200.0", "flat_rate" => nil, "estimated_days" => nil)
      post "/api/v1/mare_coral/storefront/#{fixture[:link].token}/shipping_quote",
           params: { postal_code: "01001000", order: { items: order_params(qty: 1).dig(:order, :items) } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(json_response.dig("quote", "configured")).to be(true)
      expect(json_response.dig("quote", "amount").to_d).to eq(0.to_d)
    end

    it "não permite ao admin Maré alterar outro tenant nem abrir o global" do
      other = provision_test_tenant(slug: "outra-loja")
      get "/api/v1/admin/mare_coral/retail_settings", headers: tenant_headers(other)
      expect(response).to have_http_status(:forbidden)
      get "/api/v1/admin/tenants", headers: headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "pagamento Pix simulado e reserva" do
    let(:secret) { "segredo-somente-teste" }

    before do
      tenant.tenant_config.update!(psp_api_url: "https://gateway.example.test", psp_api_key_enc: "chave-somente-teste", psp_callback_secret_enc: secret)
      within_tenant(tenant) { fixture[:link].update!(allow_payment: true) }
    end

    def create_pix_order
      post "/api/v1/mare_coral/storefront/#{fixture[:link].token}/orders",
           params: order_params(overrides: { buyer_document: "52998224725", payment_method: "pix" }), headers: headers
      expect(response).to have_http_status(:created)
      within_tenant(tenant) { Order.order(:id).last }
    end

    def signed_callback(status)
      payload = { data: { id: "mare-test-9001", status: status } }.to_json
      signature = OpenSSL::HMAC.hexdigest("SHA256", secret, payload)
      post "/api/v1/payments/webhook/mare-coral", params: payload,
           headers: { "CONTENT_TYPE" => "application/json", "X-Gateway-Signature" => signature }
      expect(response).to have_http_status(:ok)
    end

    it "confirma e cancela por callback assinado, sem duplicar baixas nem devoluções" do
      request = stub_request(:post, "https://gateway.example.test/psp/v1/pix")
        .with { |req| JSON.parse(req.body)["amount_cents"] == 46470 }
        .to_return(status: 201, body: { id: "mare-test-9001", status: "pending", pix_qr_code: "PIX-SIMULADO", pix_qr_code_url: "https://gateway.example.test/qr.png" }.to_json, headers: { "Content-Type" => "application/json" })
      order = create_pix_order
      expect(json_response.dig("payment", "pix_qr_code")).to eq("PIX-SIMULADO")
      expect(request).to have_been_requested.once
      2.times { signed_callback("paid") }
      within_tenant(tenant) do
        expect(order.reload.payment_status).to eq("paid")
        expect(order.metadata.dig("inventory", "state")).to eq("committed")
        expect(variant.reload.stock_qty).to eq(6)
      end
      2.times { signed_callback("cancelled") }
      within_tenant(tenant) do
        expect(order.reload.payment_status).to eq("cancelled")
        expect(order.metadata.dig("inventory", "state")).to eq("released")
        expect(variant.reload.stock_qty).to eq(8)
      end
    end

    it "preserva o pedido e a reserva quando o gateway falha" do
      stub_request(:post, "https://gateway.example.test/psp/v1/pix")
        .to_return(status: 422, body: { error: "recusa simulada" }.to_json)
      order = create_pix_order
      expect(json_response.dig("payment", "status")).to eq("failed")
      within_tenant(tenant) do
        expect(order.reload.payment_status).to eq("failed")
        expect(variant.reload.stock_qty).to eq(6)
        2.times { OrderFulfillment.apply(order: order.reload, evento: :cancelado) }
        expect(variant.reload.stock_qty).to eq(8)
      end
    end

    it "bloqueia cobrança quando a tarifa do pedido não está definida" do
      within_tenant(tenant) do
        metadata = fixture[:link].metadata.deep_dup
        metadata["retail_storefront"]["shipping"] = { "enabled" => true, "free_shipping_threshold" => "500", "flat_rate" => nil }
        fixture[:link].update!(metadata: metadata)
      end
      post "/api/v1/mare_coral/storefront/#{fixture[:link].token}/orders",
           params: order_params(overrides: { buyer_document: "52998224725", payment_method: "pix" }), headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      within_tenant(tenant) do
        expect(Order.count).to eq(0)
        expect(variant.reload.stock_qty).to eq(8)
      end
      expect(WebMock).not_to have_requested(:post, "https://gateway.example.test/psp/v1/pix")
    end
  end
end
