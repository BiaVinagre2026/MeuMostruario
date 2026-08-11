# frozen_string_literal: true

require "rails_helper"

# Isolamento entre tenants no dominio de catalogo de fotos.
#
# A arquitetura e schema-per-tenant: cada tenant tem suas proprias tabelas e o
# TenantSwitcher troca o search_path por requisicao. O invariante que estes
# testes protegem e que nada de um tenant aparece para outro — nem por consulta
# direta ao modelo, nem por um token de link vazado, nem por um id adivinhado
# num endpoint de admin.
RSpec.describe "Isolamento entre tenants", type: :request do
  let!(:tenant_a) { provision_test_tenant(name: "Fabrica Alfa") }
  let!(:tenant_b) { provision_test_tenant(name: "Fabrica Beta") }

  describe "dados do catalogo" do
    it "nao enxerga fotos, catalogos e pedidos criados em outro tenant" do
      create_catalog_fixture(
        tenant: tenant_a,
        link_type: "wholesale_buyer",
        show_prices: true,
        allow_order: true,
        allow_payment: false
      )

      within_tenant(tenant_b) do
        expect(Photo.count).to eq(0)
        expect(PhotoBatch.count).to eq(0)
        expect(Catalog.count).to eq(0)
        expect(CatalogLink.count).to eq(0)
        expect(Product.count).to eq(0)
      end
    end

    it "permite o mesmo SKU em tenants diferentes sem colisao" do
      %w[alfa beta].zip([tenant_a, tenant_b]).each do |_, tenant|
        within_tenant(tenant) do
          Product.create!(
            name: "Conjunto Pulse",
            slug: "conjunto-pulse",
            price_wholesale: 100,
            price_retail: 180,
            currency: "BRL",
            sku: "FIT-999",
            status: "published"
          )
        end
      end

      [tenant_a, tenant_b].each do |tenant|
        within_tenant(tenant) do
          expect(Product.where(sku: "FIT-999").count).to eq(1)
        end
      end
    end
  end

  describe "link publico por token" do
    it "nao resolve o token de um tenant quando a requisicao chega por outro" do
      fixture = create_catalog_fixture(
        tenant: tenant_a,
        link_type: "wholesale_buyer",
        show_prices: true,
        allow_order: true,
        allow_payment: false
      )

      # O mesmo token pelo tenant dono precisa responder, senao o 404 abaixo
      # poderia vir de qualquer outro motivo e o teste nao provaria isolamento.
      get "/api/v1/catalog_links/#{fixture[:link].token}", headers: tenant_headers(tenant_a)
      expect(response).to have_http_status(:ok)

      get "/api/v1/catalog_links/#{fixture[:link].token}", headers: tenant_headers(tenant_b)
      expect(response).to have_http_status(:not_found)
    end

    it "mantem catalogos distintos quando dois tenants tem o mesmo valor de token" do
      shared_token = "token-compartilhado-#{SecureRandom.hex(4)}"

      [[tenant_a, "Catalogo da Alfa"], [tenant_b, "Catalogo da Beta"]].each do |tenant, catalog_name|
        fixture = create_catalog_fixture(
          tenant: tenant,
          link_type: "wholesale_buyer",
          show_prices: true,
          allow_order: true,
          allow_payment: false
        )
        within_tenant(tenant) do
          fixture[:catalog].update!(name: catalog_name)
          fixture[:link].update!(token: shared_token)
        end
      end

      get "/api/v1/catalog_links/#{shared_token}", headers: tenant_headers(tenant_a)
      expect(json_response.dig("catalog_link", "catalog", "name")).to eq("Catalogo da Alfa")

      get "/api/v1/catalog_links/#{shared_token}", headers: tenant_headers(tenant_b)
      expect(json_response.dig("catalog_link", "catalog", "name")).to eq("Catalogo da Beta")
    end

    it "grava o pedido feito por um link apenas no tenant dono do link" do
      fixture = create_catalog_fixture(
        tenant: tenant_a,
        link_type: "wholesale_buyer",
        show_prices: true,
        allow_order: true,
        allow_payment: true
      )

      post "/api/v1/catalog_links/#{fixture[:link].token}/orders",
           params: {
             order: {
               buyer_name: "Loja Alfa",
               buyer_phone: "11999990000",
               items: [{ catalog_item_id: fixture[:item].id, qty: 2 }]
             }
           },
           headers: tenant_headers(tenant_a)

      expect(response).to have_http_status(:created)

      within_tenant(tenant_a) { expect(Order.count).to eq(1) }
      within_tenant(tenant_b) do
        expect(Order.count).to eq(0)
        expect(Payment.count).to eq(0)
      end
    end
  end

  describe "admin" do
    before do
      allow_any_instance_of(Api::V1::Admin::CatalogsController)
        .to receive(:require_operator_auth!)
        .and_return(true)
      allow_any_instance_of(Api::V1::Admin::PhotosController)
        .to receive(:require_operator_auth!)
        .and_return(true)
    end

    it "lista apenas os catalogos do tenant informado no cabecalho" do
      create_catalog_fixture(
        tenant: tenant_a,
        link_type: "public_client",
        show_prices: false,
        allow_order: false,
        allow_payment: false
      )

      get "/api/v1/admin/catalogs", headers: tenant_headers(tenant_a)
      expect(json_response["catalogs"].size).to eq(1)

      get "/api/v1/admin/catalogs", headers: tenant_headers(tenant_b)
      expect(response).to have_http_status(:ok)
      expect(json_response["catalogs"]).to eq([])
    end

    it "nao altera a foto de um tenant quando o id e usado a partir de outro" do
      fixture = create_catalog_fixture(
        tenant: tenant_a,
        link_type: "public_client",
        show_prices: false,
        allow_order: false,
        allow_payment: false
      )

      patch "/api/v1/admin/photos/bulk_update",
            params: { photo_ids: [fixture[:photo].id], approved_color: "Vermelho" },
            headers: tenant_headers(tenant_b)

      within_tenant(tenant_a) do
        expect(Photo.find(fixture[:photo].id).approved_color).to eq("Azul")
      end
    end
  end
end
