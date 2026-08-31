# frozen_string_literal: true

require "rails_helper"

RSpec.describe MareCoralInventoryService do
  let!(:tenant) { provision_test_tenant(slug: "mare-coral") }
  let!(:fixture) do
    create_catalog_fixture(
      tenant: tenant,
      link_type: "wholesale_buyer",
      show_prices: true,
      allow_order: true,
      allow_payment: false
    )
  end

  def reserved_order
    within_tenant(tenant) do
      variant = fixture[:product].variants.first
      order = Order.create!(
        buyer_name: "Cliente",
        total_units: 2,
        total_value: 439.8,
        metadata: {
          "channel" => "retail_storefront",
          "tenant_slug" => "mare-coral",
          "inventory" => {
            "state" => "reserved",
            "lines" => [{ "variant_id" => variant.id, "qty" => 2 }]
          }
        }
      )
      variant.update!(stock_qty: 6)
      order
    end
  end

  it "confirma a reserva sem baixar o estoque duas vezes" do
    order = reserved_order

    within_tenant(tenant) do
      described_class.commit!(order)
      described_class.commit!(order.reload)

      expect(order.reload.metadata.dig("inventory", "state")).to eq("committed")
      expect(fixture[:product].variants.first.reload.stock_qty).to eq(6)
    end
  end

  it "devolve o estoque uma unica vez ao cancelar" do
    order = reserved_order

    within_tenant(tenant) do
      described_class.release!(order)
      described_class.release!(order.reload)

      expect(order.reload.metadata.dig("inventory", "state")).to eq("released")
      expect(fixture[:product].variants.first.reload.stock_qty).to eq(8)
    end
  end
end
