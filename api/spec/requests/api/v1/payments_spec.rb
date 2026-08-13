# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Payments", type: :request do
  let!(:tenant) { provision_test_tenant }
  let(:secret) { "segredo-do-callback" }
  let(:json_headers) { { "CONTENT_TYPE" => "application/json" } }

  before do
    tenant.tenant_config.update!(psp_callback_secret_enc: secret)
  end

  def create_payment_fixture
    fixture = create_catalog_fixture(
      tenant: tenant,
      link_type: "wholesale_buyer",
      show_prices: true,
      allow_order: true,
      allow_payment: true
    )

    within_tenant(tenant) do
      order = OrderBuilderService.build(
        catalog_link: fixture[:link],
        buyer: { name: "Loja Mar", phone: "11911112222", document: "11222333000181" },
        items: [{
          catalog_item_id: fixture[:item].id,
          product_id: fixture[:product].id,
          product_name: fixture[:product].name,
          product_sku: fixture[:product].sku,
          color: fixture[:photo].approved_color,
          pantone: fixture[:photo].approved_pantone,
          photo_id: fixture[:photo].id,
          qty: 1,
          unit_price: 149.9
        }],
        total: 149.9
      )
      payment = GatewayPaymentService.new.create_intent!(order: order, payment_method: "pix")

      fixture.merge(order: order, payment: payment)
    end
  end

  def sign(payload, with: secret)
    OpenSSL::HMAC.hexdigest("SHA256", with, payload)
  end

  def webhook_path(slug = tenant.slug)
    "/api/v1/payments/webhook/#{slug}"
  end

  describe "POST /api/v1/payments/webhook/:tenant_slug" do
    it "confirma o pagamento quando a assinatura confere" do
      fixture = create_payment_fixture
      payload = { type: "charge.updated", data: { id: fixture[:payment].gateway_reference, status: "paid" } }.to_json

      post webhook_path, params: payload, headers: json_headers.merge("X-Gateway-Signature" => sign(payload))

      expect(response).to have_http_status(:ok)
      within_tenant(tenant) do
        expect(fixture[:payment].reload.status).to eq("paid")
        expect(fixture[:order].reload.payment_status).to eq("paid")
      end
    end

    it "recusa assinatura invalida sem tocar no pagamento" do
      fixture = create_payment_fixture
      payload = { data: { id: fixture[:payment].gateway_reference, status: "paid" } }.to_json

      post webhook_path, params: payload, headers: json_headers.merge("X-Gateway-Signature" => "invalida")

      expect(response).to have_http_status(:unauthorized)
      within_tenant(tenant) do
        expect(fixture[:payment].reload.status).to eq("pending")
        expect(fixture[:order].reload.payment_status).to eq("pending")
      end
    end

    it "usa o header configurado pelo tenant" do
      tenant.tenant_config.update!(psp_signature_header: "X-Orbe-Signature")
      fixture = create_payment_fixture
      payload = { data: { id: fixture[:payment].gateway_reference, status: "paid" } }.to_json

      post webhook_path, params: payload, headers: json_headers.merge("X-Gateway-Signature" => sign(payload))
      expect(response).to have_http_status(:unauthorized)

      post webhook_path, params: payload, headers: json_headers.merge("X-Orbe-Signature" => sign(payload))
      expect(response).to have_http_status(:ok)
    end

    it "nao aceita callback de um tenant assinado com o segredo de outro" do
      outro = provision_test_tenant(slug: "outro-#{SecureRandom.hex(3)}")
      outro.tenant_config.update!(psp_callback_secret_enc: "segredo-diferente")
      fixture = create_payment_fixture
      payload = { data: { id: fixture[:payment].gateway_reference, status: "paid" } }.to_json

      post webhook_path, params: payload, headers: json_headers.merge("X-Gateway-Signature" => sign(payload, with: "segredo-diferente"))

      expect(response).to have_http_status(:unauthorized)
      within_tenant(tenant) { expect(fixture[:payment].reload.status).to eq("pending") }
    end

    it "responde 404 para tenant inexistente" do
      payload = { data: { id: "1", status: "paid" } }.to_json

      post webhook_path("nao-existe"), params: payload, headers: json_headers.merge("X-Gateway-Signature" => sign(payload))

      expect(response).to have_http_status(:not_found)
    end

    it "responde 404 quando a cobranca nao pertence ao tenant informado" do
      fixture = create_payment_fixture
      outro = provision_test_tenant(slug: "vizinho-#{SecureRandom.hex(3)}")
      outro.tenant_config.update!(psp_callback_secret_enc: secret)
      payload = { data: { id: fixture[:payment].gateway_reference, status: "paid" } }.to_json

      post webhook_path(outro.slug), params: payload, headers: json_headers.merge("X-Gateway-Signature" => sign(payload))

      expect(response).to have_http_status(:not_found)
      within_tenant(tenant) { expect(fixture[:payment].reload.status).to eq("pending") }
    end
  end
end
