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
