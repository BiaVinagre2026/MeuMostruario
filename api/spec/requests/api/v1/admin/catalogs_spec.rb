# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Admin::Catalogs", type: :request do
  let!(:tenant) { provision_test_tenant }
  let(:headers) { tenant_headers(tenant) }

  before do
    allow_any_instance_of(Api::V1::Admin::CatalogsController)
      .to receive(:require_operator_auth!)
      .and_return(true)
  end

  it "returns catalog summaries with sku, model, color and size groups" do
    within_tenant(tenant) do
      product = Product.create!(
        name: "Conjunto Shape Short",
        slug: "conjunto-shape-short-#{SecureRandom.hex(3)}",
        description: "Modelo demo",
        price_wholesale: 129.9,
        price_retail: 259.9,
        currency: "BRL",
        sku: "FIT-101",
        status: "published"
      )

      batch = PhotoBatch.create!(name: "Lote Demo", status: "review")
      photo = batch.photos.create!(
        original_filename: "foto-1.jpeg",
        status: "approved",
        approved_color: "Preto",
        approved_pantone: "PANTONE 20-5603 TPX",
        approved_model: "Conjunto Shape Short",
        approved_size_group: "P/M",
        urls: {
          "original" => "/uploads/spec/catalogo-001.jpeg",
          "thumb" => "/uploads/spec/catalogo-001.jpeg"
        },
        product: product
      )

      catalog = Catalog.create!(
        name: "Catalogo FIT-101",
        description: "Catalogo de bloco",
        status: "published",
        source: "photo_batch_group"
      )
      catalog.catalog_items.create!(product: product, photo: photo, position: 0, visible: true)
      catalog.catalog_links.create!(link_type: "public_client", show_prices: false, allow_order: false, allow_payment: false)
      catalog.catalog_links.create!(link_type: "wholesale_buyer", show_prices: true, allow_order: true, allow_payment: true)
    end

    get "/api/v1/admin/catalogs", headers: headers

    expect(response).to have_http_status(:ok)
    summary = json_response.fetch("catalogs").first.fetch("summary")

    expect(summary).to include(
      "sku_labels" => ["FIT-101"],
      "model_labels" => ["Conjunto Shape Short"],
      "color_labels" => ["Preto"],
      "size_groups" => ["P/M"],
      "public_links_count" => 1,
      "wholesale_links_count" => 1
    )
  end

  it "updates catalog status through the existing update endpoint" do
    catalog_id = nil

    within_tenant(tenant) do
      catalog = Catalog.create!(
        name: "Catalogo de Revisao",
        description: "Status inicial draft",
        status: "draft",
        source: "photo_batch"
      )
      catalog_id = catalog.id
    end

    patch "/api/v1/admin/catalogs/#{catalog_id}",
          params: {
            catalog: {
              name: "Catalogo de Revisao",
              description: "Status atualizado",
              status: "published",
              source: "photo_batch"
            }
          },
          headers: headers

    expect(response).to have_http_status(:ok)
    expect(json_response.dig("catalog", "status")).to eq("published")
    expect(json_response.dig("catalog", "description")).to eq("Status atualizado")

    within_tenant(tenant) do
      expect(Catalog.find(catalog_id).status).to eq("published")
    end
  end

  describe "exclusao e gestao de links" do
    before do
      allow_any_instance_of(Api::V1::Admin::CatalogLinksController)
        .to receive(:require_operator_auth!)
        .and_return(true)
    end

    it "exclui o catalogo e seus links, preservando os pedidos ja recebidos" do
      fixture = create_catalog_fixture(
        tenant: tenant,
        link_type: "wholesale_buyer",
        show_prices: true,
        allow_order: true,
        allow_payment: false
      )

      post "/api/v1/catalog_links/#{fixture[:link].token}/orders",
           params: {
             order: {
               buyer_name: "Loja Mar",
               buyer_phone: "11999990000",
               items: [{ catalog_item_id: fixture[:item].id, qty: 1 }]
             }
           },
           headers: tenant_headers(tenant)
      expect(response).to have_http_status(:created)

      delete "/api/v1/admin/catalogs/#{fixture[:catalog].id}", headers: headers
      expect(response).to have_http_status(:no_content)

      within_tenant(tenant) do
        expect(Catalog.count).to eq(0)
        expect(CatalogLink.count).to eq(0)
        expect(Order.count).to eq(1)
        expect(Order.first.catalog_link_id).to be_nil
      end
    end

    it "revoga o link expirando agora, e o publico deixa de abrir" do
      fixture = create_catalog_fixture(
        tenant: tenant,
        link_type: "wholesale_buyer",
        show_prices: true,
        allow_order: true,
        allow_payment: false
      )

      get "/api/v1/catalog_links/#{fixture[:link].token}", headers: tenant_headers(tenant)
      expect(response).to have_http_status(:ok)

      patch "/api/v1/admin/catalogs/#{fixture[:catalog].id}/links/#{fixture[:link].id}",
            params: { catalog_link: { expires_at: 1.minute.ago.iso8601 } },
            headers: headers
      expect(response).to have_http_status(:ok)

      get "/api/v1/catalog_links/#{fixture[:link].token}", headers: tenant_headers(tenant)
      expect(response).to have_http_status(:not_found)
    end

    it "exclui um link sem apagar o catalogo" do
      fixture = create_catalog_fixture(
        tenant: tenant,
        link_type: "public_client",
        show_prices: false,
        allow_order: false,
        allow_payment: false
      )

      delete "/api/v1/admin/catalogs/#{fixture[:catalog].id}/links/#{fixture[:link].id}", headers: headers

      expect(response).to have_http_status(:no_content)
      within_tenant(tenant) do
        expect(CatalogLink.count).to eq(0)
        expect(Catalog.count).to eq(1)
      end
    end
  end
end
