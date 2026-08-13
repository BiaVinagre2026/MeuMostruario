# frozen_string_literal: true

require "rails_helper"
require "webmock/rspec"

RSpec.describe GatewayPaymentService do
  let!(:tenant) { provision_test_tenant(slug: "psp-#{SecureRandom.hex(3)}") }

  let(:configured_config) do
    tenant.tenant_config.tap do |config|
      config.update!(
        psp_api_url: "https://api.exemplo-psp.com",
        psp_api_key_enc: "chave-secreta",
        psp_merchant_id: "mrc_123"
      )
    end
  end

  def build_order(total: 250.0, document: "11222333000181")
    within_tenant(tenant) do
      Order.create!(
        buyer_name: "Loja Mar",
        buyer_phone: "11999990000",
        buyer_document: document,
        total_value: total,
        total_units: 2,
        status: "pending",
        payment_status: "pending"
      )
    end
  end

  def charge_response(overrides = {})
    {
      "id" => 9001,
      "status" => "pending",
      "payment_method" => "pix",
      "amount_cents" => 25_000,
      "pix_qr_code" => "00020126BR.GOV.BCB.PIX...",
      "pix_qr_code_url" => "https://psp.exemplo/qr/9001.png",
      "pix_expiration" => "2026-08-13T23:59:59Z"
    }.merge(overrides)
  end

  describe "#create_intent!" do
    it "cria a cobranca no gateway e guarda QR Code e referencia" do
      order = build_order
      stub = stub_request(:post, "https://api.exemplo-psp.com/psp/v1/pix")
        .to_return(status: 201, body: charge_response.to_json, headers: { "Content-Type" => "application/json" })

      payment = within_tenant(tenant) do
        described_class.new(config: configured_config).create_intent!(order: order, payment_method: "pix")
      end

      expect(stub).to have_been_requested
      within_tenant(tenant) do
        expect(payment.gateway_reference).to eq("9001")
        expect(payment.pix_qr_code).to start_with("00020126")
        expect(payment.checkout_url).to eq("https://psp.exemplo/qr/9001.png")
        expect(payment.status).to eq("pending")
        expect(payment.idempotency_key).to be_present
      end
    end

    it "envia valor em centavos, documento so com digitos e a Idempotency-Key" do
      order = build_order(total: 576.0, document: "112.223.330.001-81")
      captured = nil

      stub_request(:post, "https://api.exemplo-psp.com/psp/v1/pix")
        .with { |request| captured = request; true }
        .to_return(status: 201, body: charge_response.to_json, headers: { "Content-Type" => "application/json" })

      payment = within_tenant(tenant) do
        described_class.new(config: configured_config).create_intent!(order: order, payment_method: "pix")
      end

      body = JSON.parse(captured.body)
      expect(body["amount_cents"]).to eq(57_600)
      expect(body["customer_document"]).to eq("11222333000181")
      expect(body["callback_url"]).to end_with("/api/v1/payments/webhook/#{tenant.slug}")
      expect(body["client_reference"]).to eq("#{tenant.slug}-#{order.id}")
      expect(captured.headers["Authorization"]).to eq("Bearer chave-secreta")
      expect(captured.headers["Idempotency-Key"]).to eq(payment.idempotency_key)
    end

    it "marca o pagamento como falho sem derrubar o pedido quando o gateway recusa" do
      order = build_order
      stub_request(:post, "https://api.exemplo-psp.com/psp/v1/pix")
        .to_return(status: 422, body: { error: "customer_document invalido" }.to_json)

      payment = within_tenant(tenant) do
        described_class.new(config: configured_config).create_intent!(order: order, payment_method: "pix")
      end

      within_tenant(tenant) do
        expect(payment.status).to eq("failed")
        expect(payment.raw_response["message"]).to include("customer_document invalido")
        expect(order.reload.payment_status).to eq("failed")
        expect(Order.exists?(order.id)).to be(true)
      end
    end

    it "nao chama o gateway quando o tenant nao tem credencial" do
      order = build_order

      payment = within_tenant(tenant) do
        described_class.new(config: tenant.tenant_config).create_intent!(order: order, payment_method: "pix")
      end

      expect(a_request(:post, /psp\/v1\/pix/)).not_to have_been_made
      expect(payment.raw_response["mode"]).to eq("local_placeholder")
      expect(payment.gateway_reference).to start_with("local-")
    end
  end

  describe "#apply_webhook!" do
    def create_payment(reference: "9001")
      within_tenant(tenant) do
        order = Order.create!(buyer_name: "Loja Mar", total_value: 250, total_units: 1, status: "pending", payment_status: "pending")
        order.payments.create!(amount: 250, payment_method: "pix", status: "pending", gateway_reference: reference)
      end
    end

    it "aceita o formato aninhado em data e marca como pago" do
      payment = create_payment

      within_tenant(tenant) do
        described_class.new(config: configured_config).apply_webhook!(
          { "type" => "charge.updated", "data" => { "id" => 9001, "status" => "paid" } }
        )

        expect(payment.reload.status).to eq("paid")
        expect(payment.paid_at).to be_present
        expect(payment.order.reload.payment_status).to eq("paid")
      end
    end

    it "trata captured como pago" do
      payment = create_payment(reference: "9002")

      within_tenant(tenant) do
        described_class.new(config: configured_config).apply_webhook!(
          { "data" => { "id" => 9002, "status" => "captured" } }
        )

        expect(payment.reload.status).to eq("paid")
      end
    end

    it "mantem pendente para status intermediarios do gateway" do
      payment = create_payment(reference: "9003")

      within_tenant(tenant) do
        %w[processing authorized pending].each do |status|
          described_class.new(config: configured_config).apply_webhook!(
            { "data" => { "id" => 9003, "status" => status } }
          )
          expect(payment.reload.status).to eq("pending")
        end
      end
    end

    it "nao reescreve paid_at quando o gateway reenvia a confirmacao" do
      payment = create_payment(reference: "9004")

      within_tenant(tenant) do
        service = described_class.new(config: configured_config)
        service.apply_webhook!({ "data" => { "id" => 9004, "status" => "paid" } })
        primeiro = payment.reload.paid_at

        service.apply_webhook!({ "data" => { "id" => 9004, "status" => "paid" } })
        expect(payment.reload.paid_at).to eq(primeiro)
      end
    end
  end
end
