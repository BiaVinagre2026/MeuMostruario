# frozen_string_literal: true

require "rails_helper"

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
end
