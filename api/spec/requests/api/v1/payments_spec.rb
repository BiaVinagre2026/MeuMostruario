# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Payments", type: :request do
  let!(:tenant) { provision_test_tenant }
  let(:headers) { tenant_headers(tenant, "CONTENT_TYPE" => "application/json") }
  let(:secret) { "webhook-secret" }

  before do
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("GATEWAY_WEBHOOK_SECRET").and_return(secret)
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
        buyer: { name: "Loja Mar", phone: "11911112222" },
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

  describe "POST /api/v1/payments/webhook" do
    it "updates payment and order status when the signature is valid" do
      fixture = create_payment_fixture
      payload = {
        gateway_reference: fixture[:payment].gateway_reference,
        status: "paid"
      }.to_json
      signature = OpenSSL::HMAC.hexdigest("SHA256", secret, payload)

      post "/api/v1/payments/webhook",
           params: payload,
           headers: headers.merge("X-Gateway-Signature" => signature)

      expect(response).to have_http_status(:ok)

      within_tenant(tenant) do
        expect(fixture[:payment].reload.status).to eq("paid")
        expect(fixture[:order].reload.payment_status).to eq("paid")
      end
    end

    it "rejects invalid signatures" do
      fixture = create_payment_fixture
      payload = {
        gateway_reference: fixture[:payment].gateway_reference,
        status: "paid"
      }.to_json

      post "/api/v1/payments/webhook",
           params: payload,
           headers: headers.merge("X-Gateway-Signature" => "invalid")

      expect(response).to have_http_status(:unauthorized)

      within_tenant(tenant) do
        expect(fixture[:payment].reload.status).to eq("pending")
        expect(fixture[:order].reload.payment_status).to eq("pending")
      end
    end
  end
end
