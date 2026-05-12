# frozen_string_literal: true

require "rails_helper"

RSpec.describe OrderBuilderService do
  let(:tenant) { provision_tenant(slug: "orders-test-#{SecureRandom.hex(3)}") }

  around do |example|
    with_tenant(tenant) { example.run }
  end

  after do
    ActiveRecord::Base.connection.execute(
      "DROP SCHEMA IF EXISTS #{ActiveRecord::Base.connection.quote_column_name(tenant.schema_name)} CASCADE"
    )
  end

  describe ".build" do
    context "with legacy item payload (scalar qty)" do
      let(:items) do
        [
          {
            product_id: nil,
            product_name: "Calça Slim",
            product_sku: "CAL-001",
            color: "Preto",
            size: "M",
            qty: 2,
            unit_price: 89.90
          }
        ]
      end

      it "creates an order with one order_item" do
        order = described_class.build(member_id: 1, items: items)

        expect(order).to be_persisted
        expect(order.order_items.count).to eq(1)
        expect(order.total_units).to eq(2)
      end

      it "sets status to pending" do
        order = described_class.build(member_id: 1, items: items)
        expect(order.status).to eq("pending")
      end

      it "stores notes on the order" do
        order = described_class.build(member_id: 1, items: items, notes: "Urgente")
        expect(order.notes).to eq("Urgente")
      end

      it "skips items with qty <= 0" do
        bad_items = [items.first.merge(qty: 0)]
        order = described_class.build(member_id: 1, items: bad_items)
        expect(order.order_items.count).to eq(0)
        expect(order.total_units).to eq(0)
      end
    end

    context "with wholesale payload (graded qty hash)" do
      let(:items) do
        [
          {
            product_id: nil,
            product_name: "Blusa Fitness",
            sku: "BLU-001",
            color: "Rosa",
            color_hex: "#ff9999",
            image_url: "/uploads/blusa.jpg",
            price: 65.00,
            qty: { "P" => 2, "M" => 3, "G" => 1 },
            total: 390.00
          }
        ]
      end

      it "creates one order_item per size" do
        order = described_class.build(member_id: 1, items: items)
        expect(order.order_items.count).to eq(3)
      end

      it "calculates total_units correctly" do
        order = described_class.build(member_id: 1, items: items)
        expect(order.total_units).to eq(6)
      end

      it "skips sizes with qty <= 0" do
        items_with_zero = [items.first.merge(qty: { "P" => 2, "M" => 0, "G" => 1 })]
        order = described_class.build(member_id: 1, items: items_with_zero)
        expect(order.order_items.count).to eq(2)
      end

      it "stores color_hex and image_url in item metadata" do
        order = described_class.build(member_id: 1, items: items)
        meta = order.order_items.first.metadata
        expect(meta["color_hex"]).to eq("#ff9999")
        expect(meta["image_url"]).to eq("/uploads/blusa.jpg")
      end
    end

    context "with discount applied" do
      let(:items) { [{ product_name: "Top", qty: 1, unit_price: 100, size: "M" }] }

      it "overrides total_value with frontend total when discount is present" do
        order = described_class.build(
          member_id: 1,
          items: items,
          subtotal: 100,
          discount: 10,
          discount_pct: 10,
          total: 90
        )
        expect(order.total_value).to eq(90)
      end

      it "stores discount metadata on the order" do
        order = described_class.build(
          member_id: 1,
          items: items,
          subtotal: 100,
          discount: 10,
          discount_pct: 10,
          total: 90
        )
        expect(order.metadata["discount_pct"]).to eq(10)
        expect(order.metadata["discount"]).to eq("10.0")
      end
    end

    it "raises ActiveRecord::RecordInvalid when items list is empty and the order has no items" do
      expect do
        described_class.build(member_id: nil, items: [])
      end.to raise_error(ActiveRecord::RecordInvalid)
    end
  end
end
