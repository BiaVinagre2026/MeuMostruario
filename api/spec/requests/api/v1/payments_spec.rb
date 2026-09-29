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
        }]
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
    context "com o contrato Orbe PSP 1.1.0 selecionado pelo tenant" do
      before { tenant.tenant_config.update!(psp_signature_header: "X-PSP-Signature") }

      def timestamped_signature(payload, timestamp: Time.now.to_i, with: secret)
        "t=#{timestamp},v1=#{sign("#{timestamp}.#{payload}", with: with)}"
      end

      it "confirma o pagamento com X-PSP-Signature sem exigir header de tenant" do
        fixture = create_payment_fixture
        payload = { data: { id: fixture[:payment].gateway_reference, status: "paid" } }.to_json

        post webhook_path, params: payload, headers: json_headers.merge("X-PSP-Signature" => timestamped_signature(payload))

        expect(response).to have_http_status(:ok)
        within_tenant(tenant) do
          expect(fixture[:payment].reload.status).to eq("paid")
          expect(fixture[:order].reload.payment_status).to eq("paid")
        end
      end

      it "aceita assinatura valida na janela de rotacao de segredos" do
        fixture = create_payment_fixture
        payload = { data: { id: fixture[:payment].gateway_reference, status: "paid" } }.to_json
        header = timestamped_signature(payload).sub(",v1=", ",v1=#{'0' * 64},v1=")

        post webhook_path, params: payload, headers: json_headers.merge("X-PSP-Signature" => header)

        expect(response).to have_http_status(:ok)
      end

      [-601, 601].each do |offset|
        it "recusa timestamp distante #{offset} segundos sem alterar o pagamento" do
          fixture = create_payment_fixture
          payload = { data: { id: fixture[:payment].gateway_reference, status: "paid" } }.to_json
          header = timestamped_signature(payload, timestamp: Time.now.to_i + offset)

          post webhook_path, params: payload, headers: json_headers.merge("X-PSP-Signature" => header)

          expect(response).to have_http_status(:unauthorized)
          within_tenant(tenant) { expect(fixture[:payment].reload.status).to eq("pending") }
        end
      end

      it "recusa segredo de outro tenant mesmo no novo formato" do
        fixture = create_payment_fixture
        payload = { data: { id: fixture[:payment].gateway_reference, status: "paid" } }.to_json

        post webhook_path, params: payload,
             headers: json_headers.merge("X-PSP-Signature" => timestamped_signature(payload, with: "outro-segredo"))

        expect(response).to have_http_status(:unauthorized)
        within_tenant(tenant) { expect(fixture[:payment].reload.status).to eq("pending") }
      end

      it "nao aceita assinatura legada como alternativa ao formato novo" do
        fixture = create_payment_fixture
        payload = { data: { id: fixture[:payment].gateway_reference, status: "paid" } }.to_json

        post webhook_path, params: payload,
             headers: json_headers.merge("X-PSP-Signature" => "invalida", "X-Gateway-Signature" => sign(payload))

        expect(response).to have_http_status(:unauthorized)
        within_tenant(tenant) { expect(fixture[:payment].reload.status).to eq("pending") }
      end

      it "exige segredo exclusivo do tenant mesmo havendo segredo global" do
        tenant.tenant_config.update!(psp_callback_secret_enc: nil)
        allow(ENV).to receive(:[]).and_call_original
        allow(ENV).to receive(:[]).with("GATEWAY_WEBHOOK_SECRET").and_return(secret)
        payload = { data: { id: "nao-deve-consultar", status: "paid" } }.to_json

        post webhook_path, params: payload, headers: json_headers.merge("X-PSP-Signature" => timestamped_signature(payload))

        expect(response).to have_http_status(:service_unavailable)
      end

      it "nao encontra no outro tenant uma cobranca assinada corretamente" do
        fixture = create_payment_fixture
        outro = provision_test_tenant(slug: "orbe-outro-#{SecureRandom.hex(3)}")
        outro.tenant_config.update!(psp_signature_header: "X-PSP-Signature", psp_callback_secret_enc: "outro-segredo")
        payload = { data: { id: fixture[:payment].gateway_reference, status: "paid" } }.to_json

        post webhook_path(outro.slug), params: payload,
             headers: json_headers.merge("X-PSP-Signature" => timestamped_signature(payload, with: "outro-segredo"))

        expect(response).to have_http_status(:not_found)
        within_tenant(tenant) { expect(fixture[:payment].reload.status).to eq("pending") }
      end
    end

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

    it "aceita a assinatura em qualquer cabecalho conhecido enquanto a Casetec nao confirma o nome" do
      fixture = create_payment_fixture
      payload = { data: { id: fixture[:payment].gateway_reference, status: "paid" } }.to_json

      post webhook_path, params: payload, headers: json_headers.merge("X-Orbe-Signature" => sign(payload))

      expect(response).to have_http_status(:ok)
      within_tenant(tenant) { expect(fixture[:payment].reload.status).to eq("paid") }
    end

    it "aceita a assinatura em base64 e com o prefixo sha256=" do
      fixture = create_payment_fixture
      payload = { data: { id: fixture[:payment].gateway_reference, status: "paid" } }.to_json
      base64 = Base64.strict_encode64(OpenSSL::HMAC.digest("SHA256", secret, payload))

      post webhook_path, params: payload,
           headers: json_headers.merge("X-Signature" => "sha256=#{base64}")

      expect(response).to have_http_status(:ok)
      within_tenant(tenant) { expect(fixture[:payment].reload.status).to eq("paid") }
    end

    it "recusa cabecalho conhecido com assinatura errada" do
      fixture = create_payment_fixture
      payload = { data: { id: fixture[:payment].gateway_reference, status: "paid" } }.to_json

      post webhook_path, params: payload,
           headers: json_headers.merge("X-Orbe-Signature" => sign(payload, with: "outro-segredo"))

      expect(response).to have_http_status(:unauthorized)
      within_tenant(tenant) { expect(fixture[:payment].reload.status).to eq("pending") }
    end

    it "nao rebaixa um pagamento pago quando o callback atrasado chega depois" do
      fixture = create_payment_fixture
      referencia = fixture[:payment].gateway_reference
      pago = { data: { id: referencia, status: "paid" } }.to_json
      atrasado = { data: { id: referencia, status: "processing" } }.to_json

      post webhook_path, params: pago, headers: json_headers.merge("X-Gateway-Signature" => sign(pago))
      post webhook_path, params: atrasado, headers: json_headers.merge("X-Gateway-Signature" => sign(atrasado))

      expect(response).to have_http_status(:ok)
      within_tenant(tenant) do
        expect(fixture[:payment].reload.status).to eq("paid")
        expect(fixture[:order].reload.payment_status).to eq("paid")
      end
    end

    it "aceita o cancelamento depois do pagamento, que e caminho de volta legitimo" do
      fixture = create_payment_fixture
      referencia = fixture[:payment].gateway_reference
      pago = { data: { id: referencia, status: "paid" } }.to_json
      cancelado = { data: { id: referencia, status: "cancelled" } }.to_json

      post webhook_path, params: pago, headers: json_headers.merge("X-Gateway-Signature" => sign(pago))
      post webhook_path, params: cancelado, headers: json_headers.merge("X-Gateway-Signature" => sign(cancelado))

      within_tenant(tenant) { expect(fixture[:payment].reload.status).to eq("cancelled") }
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
