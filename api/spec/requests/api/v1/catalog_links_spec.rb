# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::CatalogLinks", type: :request do
  let!(:tenant) { provision_test_tenant }
  let(:headers) { tenant_headers(tenant) }

  describe "GET /api/v1/catalog_links/:token" do
    it "does not expose prices for public links" do
      fixture = create_catalog_fixture(
        tenant: tenant,
        link_type: "public_client",
        show_prices: true,
        allow_order: true,
        allow_payment: true
      )

      get "/api/v1/catalog_links/#{fixture[:link].token}", headers: headers

      expect(response).to have_http_status(:ok)
      item = json_response.dig("catalog_link", "items", 0)
      expect(item["price"]).to be_nil
      expect(item["price_retail"]).to be_nil
      expect(json_response.dig("catalog_link", "allow_order")).to eq(false)
      expect(json_response.dig("catalog_link", "allow_payment")).to eq(false)
    end

    it "exposes prices for wholesale links" do
      fixture = create_catalog_fixture(
        tenant: tenant,
        link_type: "wholesale_buyer",
        show_prices: true,
        allow_order: true,
        allow_payment: false
      )

      get "/api/v1/catalog_links/#{fixture[:link].token}", headers: headers

      expect(response).to have_http_status(:ok)
      item = json_response.dig("catalog_link", "items", 0)
      expect(item["price"]).to eq("149.9")
      expect(item["price_retail"]).to eq("219.9")
      expect(item["pantone"]).to eq("19-4052 TPX")
      expect(item["size_group"]).to eq("M/G")
    end

    it "does not repeat a size that the product variant and the photo share" do
      fixture = create_catalog_fixture(
        tenant: tenant,
        link_type: "wholesale_buyer",
        show_prices: true,
        allow_order: true,
        allow_payment: false
      )

      get "/api/v1/catalog_links/#{fixture[:link].token}", headers: headers

      item = json_response.dig("catalog_link", "items", 0)
      expect(item["sizes"]).to eq(["M/G"])
    end
  end

  describe "POST /api/v1/catalog_links/:token/interests" do
    it "creates a lead and a sent selection for public links" do
      fixture = create_catalog_fixture(
        tenant: tenant,
        link_type: "public_client",
        show_prices: false,
        allow_order: false,
        allow_payment: false
      )

      post "/api/v1/catalog_links/#{fixture[:link].token}/interests",
           params: {
             name: "Cliente Final",
             email: "cliente@example.com",
             message: "Gostei dessas fotos",
             catalog_item_ids: [fixture[:item].id]
           },
           headers: headers

      expect(response).to have_http_status(:created)
      expect(json_response["message"]).to eq("Interesse registrado")

      within_tenant(tenant) do
        lead = Lead.order(:id).last
        selection = Selection.order(:id).last

        expect(lead.email).to eq("cliente@example.com")
        expect(lead.metadata["catalog_link_id"]).to eq(fixture[:link].id)
        expect(selection.status).to eq("sent")
        expect(selection.selection_items.count).to eq(1)
      end
    end
  end

  describe "preco do pedido" do
    it "ignora o preco enviado pelo comprador e cobra o do banco" do
      fixture = create_catalog_fixture(
        tenant: tenant, link_type: "wholesale_buyer",
        show_prices: true, allow_order: true, allow_payment: false
      )

      # Quem abre o link de atacado controla a requisicao. Mandar unit_price 1
      # nao pode levar uma peca de 149,90 por 1 real.
      post "/api/v1/catalog_links/#{fixture[:link].token}/orders",
           params: {
             order: {
               buyer_name: "Comprador Esperto",
               buyer_phone: "11999990000",
               items: [{ catalog_item_id: fixture[:item].id, qty: 1, unit_price: 1, price: 1 }]
             }
           },
           headers: headers

      expect(response).to have_http_status(:created)
      within_tenant(tenant) do
        item = Order.order(:id).last.order_items.first
        expect(item.unit_price.to_d).to eq(149.9.to_d)
      end
    end
  end

  describe "pedido minimo do atacado" do
    def fixture_com_minimo(valor)
      tenant.tenant_config.update!(min_order_amount: valor)
      create_catalog_fixture(
        tenant: tenant, link_type: "wholesale_buyer",
        show_prices: true, allow_order: true, allow_payment: false
      )
    end

    def post_order(fixture, qty:)
      post "/api/v1/catalog_links/#{fixture[:link].token}/orders",
           params: {
             order: {
               buyer_name: "Loja Oceano",
               buyer_phone: "11999990000",
               items: [{ catalog_item_id: fixture[:item].id, qty: qty }]
             }
           },
           headers: headers
    end

    it "recusa pedido abaixo do minimo do tenant" do
      # A fixture custa 149,90 por peca; uma peca fica abaixo de 300.
      fixture = fixture_com_minimo(300)

      post_order(fixture, qty: 1)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response["errors"].first).to include("pedido minimo")
      within_tenant(tenant) { expect(Order.count).to eq(0) }
    end

    it "aceita pedido que alcanca o minimo" do
      # 3 x 149,90 = 449,70, acima dos 300.
      fixture = fixture_com_minimo(300)

      post_order(fixture, qty: 3)

      expect(response).to have_http_status(:created)
      within_tenant(tenant) { expect(Order.count).to eq(1) }
    end

    it "ignora o total inflado pelo cliente e confere pelo preco do banco" do
      fixture = fixture_com_minimo(300)

      # Cliente afirma que o pedido soma 999, mas uma peca vale 149,90.
      post "/api/v1/catalog_links/#{fixture[:link].token}/orders",
           params: {
             order: {
               buyer_name: "Loja Oceano",
               buyer_phone: "11999990000",
               total: 999,
               subtotal: 999,
               items: [{ catalog_item_id: fixture[:item].id, qty: 1, unit_price: 999 }]
             }
           },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response["errors"].first).to include("pedido minimo")
    end

    it "nao aplica minimo quando o tenant nao configurou" do
      fixture = fixture_com_minimo(0)

      post_order(fixture, qty: 1)

      expect(response).to have_http_status(:created)
    end

    it "expoe o minimo no link para a tela avisar antes do envio" do
      fixture = fixture_com_minimo(300)

      get "/api/v1/catalog_links/#{fixture[:link].token}", headers: headers

      expect(json_response.dig("catalog_link", "min_order_amount").to_d).to eq(300.to_d)
    end
  end

  describe "documento do comprador" do
    def post_order(link, document:, allow_payment:)
      post "/api/v1/catalog_links/#{link[:link].token}/orders",
           params: {
             order: {
               buyer_name: "Loja Oceano",
               buyer_phone: "11999990000",
               buyer_document: document,
               items: [{ catalog_item_id: link[:item].id, qty: 1 }]
             }
           },
           headers: headers
    end

    it "exige o documento quando o link cobra" do
      fixture = create_catalog_fixture(
        tenant: tenant, link_type: "wholesale_buyer",
        show_prices: true, allow_order: true, allow_payment: true
      )

      post_order(fixture, document: nil, allow_payment: true)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response["errors"]).to include("informe o CPF ou CNPJ do comprador")
    end

    it "dispensa o documento quando o link nao cobra" do
      fixture = create_catalog_fixture(
        tenant: tenant, link_type: "wholesale_buyer",
        show_prices: true, allow_order: true, allow_payment: false
      )

      post_order(fixture, document: nil, allow_payment: false)

      expect(response).to have_http_status(:created)
    end

    it "recusa documento com digito verificador errado" do
      fixture = create_catalog_fixture(
        tenant: tenant, link_type: "wholesale_buyer",
        show_prices: true, allow_order: true, allow_payment: false
      )

      post_order(fixture, document: "529.982.247-24", allow_payment: false)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response["errors"]).to include("CPF ou CNPJ invalido")
    end

    it "aceita CPF, guardando apenas os digitos" do
      fixture = create_catalog_fixture(
        tenant: tenant, link_type: "wholesale_buyer",
        show_prices: true, allow_order: true, allow_payment: false
      )

      post_order(fixture, document: "529.982.247-25", allow_payment: false)

      expect(response).to have_http_status(:created)
      within_tenant(tenant) do
        expect(Order.order(:id).last.buyer_document).to eq("52998224725")
      end
    end

    it "aceita CNPJ, guardando apenas os digitos" do
      fixture = create_catalog_fixture(
        tenant: tenant, link_type: "wholesale_buyer",
        show_prices: true, allow_order: true, allow_payment: false
      )

      post_order(fixture, document: "11.222.333/0001-81", allow_payment: false)

      expect(response).to have_http_status(:created)
      within_tenant(tenant) do
        expect(Order.order(:id).last.buyer_document).to eq("11222333000181")
      end
    end

    it "nao devolve o documento na resposta do pedido" do
      fixture = create_catalog_fixture(
        tenant: tenant, link_type: "wholesale_buyer",
        show_prices: true, allow_order: true, allow_payment: false
      )

      post_order(fixture, document: "529.982.247-25", allow_payment: false)

      expect(json_response["order"]).not_to have_key("buyer_document")
    end
  end

  describe "POST /api/v1/catalog_links/:token/orders" do
    it "creates an anonymous wholesale order and keeps the price snapshot" do
      fixture = create_catalog_fixture(
        tenant: tenant,
        link_type: "wholesale_buyer",
        show_prices: true,
        allow_order: true,
        allow_payment: true
      )

      post "/api/v1/catalog_links/#{fixture[:link].token}/orders",
           params: {
             order: {
               buyer_name: "Loja Oceano",
               buyer_phone: "11999990000",
               buyer_email: "compras@oceano.com",
               buyer_document: "11.222.333/0001-81",
               payment_method: "pix",
               items: [
                 {
                   catalog_item_id: fixture[:item].id,
                   qty: 2
                 }
               ]
             }
           },
           headers: headers

      expect(response).to have_http_status(:created)
      expect(json_response.dig("order", "buyer_name")).to eq("Loja Oceano")
      expect(json_response.dig("order", "payment_status")).to eq("pending")
      expect(json_response.dig("payment", "status")).to eq("pending")

      within_tenant(tenant) do
        order = Order.order(:id).last
        order_item = order.order_items.first

        expect(order.catalog_link_id).to eq(fixture[:link].id)
        expect(order.payment_status).to eq("pending")
        expect(order_item.unit_price.to_d).to eq(149.9.to_d)
        expect(order_item.metadata["pantone"]).to eq("19-4052 TPX")
        expect(order_item.metadata["photo_id"]).to eq(fixture[:photo].id)

        fixture[:product].update!(price_wholesale: 199.9)

        expect(order.reload.total_value.to_d).to eq(299.8.to_d)
        expect(order.order_items.first.unit_price.to_d).to eq(149.9.to_d)
      end
    end
  end
end
