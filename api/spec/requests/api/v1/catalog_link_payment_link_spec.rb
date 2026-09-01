# frozen_string_literal: true

require "rails_helper"
require "webmock/rspec"

RSpec.describe "Api::V1::CatalogLinks payment_link", type: :request do
  let!(:tenant) { provision_test_tenant }
  let(:headers) { tenant_headers(tenant) }

  def fixture_com_pedido(allow_payment: true)
    fixture = create_catalog_fixture(
      tenant: tenant, link_type: "wholesale_buyer",
      show_prices: true, allow_order: true, allow_payment: allow_payment
    )

    post "/api/v1/catalog_links/#{fixture[:link].token}/orders",
         params: {
           order: {
             buyer_name: "Loja Mar",
             buyer_phone: "11999990000",
             buyer_document: "11222333000181",
             items: [{ catalog_item_id: fixture[:item].id, qty: 2 }]
           }
         },
         headers: headers

    fixture.merge(order_id: json_response.dig("order", "id"))
  end

  it "recusa quando o link nao permite pagamento" do
    fixture = fixture_com_pedido(allow_payment: false)

    post "/api/v1/catalog_links/#{fixture[:link].token}/orders/#{fixture[:order_id]}/payment_link",
         headers: headers

    expect(response).to have_http_status(:unprocessable_entity)
  end

  it "recusa pedido que nao nasceu deste link" do
    fixture = fixture_com_pedido
    outro = create_catalog_fixture(
      tenant: tenant, link_type: "wholesale_buyer",
      show_prices: true, allow_order: true, allow_payment: true
    )

    # O pedido existe, mas pertence ao primeiro link. Sem a checagem, quem
    # tivesse qualquer token valido emitiria cobranca para pedido alheio.
    post "/api/v1/catalog_links/#{outro[:link].token}/orders/#{fixture[:order_id]}/payment_link",
         headers: headers

    expect(response).to have_http_status(:not_found)
  end

  it "registra em modo local quando o tenant nao conectou o gateway" do
    fixture = fixture_com_pedido

    post "/api/v1/catalog_links/#{fixture[:link].token}/orders/#{fixture[:order_id]}/payment_link",
         headers: headers

    expect(response).to have_http_status(:created)
    expect(json_response.dig("payment", "payment_method")).to eq("payment_link")
    expect(json_response.dig("payment", "checkout_url")).to be_nil
  end

  context "com gateway configurado" do
    before do
      tenant.tenant_config.update!(
        psp_api_url: "https://api.exemplo.test",
        psp_api_key_enc: "chave-de-teste"
      )

      # Criar o pedido ja emite o Pix. Sem este stub a chamada real seria
      # bloqueada e o pedido nem chegaria a existir para o teste do link.
      stub_request(:post, "https://api.exemplo.test/psp/v1/pix")
        .to_return(
          status: 201,
          body: { id: 555, status: "pending", pix_qr_code: "000201..." }.to_json,
          headers: { "Content-Type" => "application/json" }
        )
    end

    it "cria o link hospedado e devolve o endereco do checkout" do
      stub_request(:post, "https://api.exemplo.test/psp/v1/payment_links")
        .to_return(
          status: 201,
          body: { id: 9, slug: "abc123def456ghij", status: "active" }.to_json,
          headers: { "Content-Type" => "application/json" }
        )

      fixture = fixture_com_pedido

      post "/api/v1/catalog_links/#{fixture[:link].token}/orders/#{fixture[:order_id]}/payment_link",
           headers: headers

      expect(response).to have_http_status(:created)
      expect(json_response.dig("payment", "checkout_url")).to eq("https://psp.casetec.com.br/pay/abc123def456ghij")
      expect(json_response.dig("payment", "gateway_reference")).to eq("abc123def456ghij")
    end

    it "prefere o endereco devolvido pelo gateway ao construido" do
      stub_request(:post, "https://api.exemplo.test/psp/v1/payment_links")
        .to_return(
          status: 201,
          body: { id: 9, slug: "abc123", status: "active", checkout_url: "https://outro.dominio/pagar/abc123" }.to_json,
          headers: { "Content-Type" => "application/json" }
        )

      fixture = fixture_com_pedido

      post "/api/v1/catalog_links/#{fixture[:link].token}/orders/#{fixture[:order_id]}/payment_link",
           headers: headers

      expect(json_response.dig("payment", "checkout_url")).to eq("https://outro.dominio/pagar/abc123")
    end

    it "envia o valor em centavos, o documento so com digitos e o callback do tenant" do
      requisicao = stub_request(:post, "https://api.exemplo.test/psp/v1/payment_links")
        .to_return(
          status: 201,
          body: { id: 9, slug: "abc123", status: "active" }.to_json,
          headers: { "Content-Type" => "application/json" }
        )

      fixture = fixture_com_pedido

      post "/api/v1/catalog_links/#{fixture[:link].token}/orders/#{fixture[:order_id]}/payment_link",
           headers: headers

      expect(requisicao.with { |req|
        corpo = JSON.parse(req.body)
        corpo["amount_cents"] == 29_980 &&
          corpo["customer_document"] == "11222333000181" &&
          corpo["notification_url"].include?("/api/v1/payments/webhook/#{tenant.slug}")
      }).to have_been_made
    end

    it "nao abre um segundo link quando ja existe um pendente" do
      stub_request(:post, "https://api.exemplo.test/psp/v1/payment_links")
        .to_return(
          status: 201,
          body: { id: 9, slug: "abc123", status: "active" }.to_json,
          headers: { "Content-Type" => "application/json" }
        )

      fixture = fixture_com_pedido
      caminho = "/api/v1/catalog_links/#{fixture[:link].token}/orders/#{fixture[:order_id]}/payment_link"

      post caminho, headers: headers
      post caminho, headers: headers

      within_tenant(tenant) do
        expect(Payment.where(payment_method: "payment_link").count).to eq(1)
      end
    end

    it "mantem o pedido quando a emissao do link falha" do
      stub_request(:post, "https://api.exemplo.test/psp/v1/payment_links")
        .to_return(status: 422, body: { error: "documento invalido" }.to_json,
                   headers: { "Content-Type" => "application/json" })

      fixture = fixture_com_pedido

      post "/api/v1/catalog_links/#{fixture[:link].token}/orders/#{fixture[:order_id]}/payment_link",
           headers: headers

      expect(response).to have_http_status(:created)
      expect(json_response.dig("payment", "status")).to eq("failed")
      expect(json_response.dig("payment", "error_message")).to include("documento invalido")
      within_tenant(tenant) { expect(Order.find(fixture[:order_id])).to be_present }
    end
  end
end
