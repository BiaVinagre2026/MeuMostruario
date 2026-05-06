# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Tenant schema isolation", type: :model do
  let(:tenant_a_schema) { "tenant_spec_alpha" }
  let(:tenant_b_schema) { "tenant_spec_beta" }

  around do |example|
    with_tenant_schemas(tenant_a_schema, tenant_b_schema) do
      example.run
    end
  end

  it "keeps looks isolated between tenant schemas" do
    TenantSwitcher.switch!(tenant_a_schema)
    Look.create!(name: "Look Alpha", status: "published", position: 1)

    TenantSwitcher.switch!(tenant_b_schema)
    Look.create!(name: "Look Beta", status: "published", position: 1)

    TenantSwitcher.switch!(tenant_a_schema)
    expect(Look.pluck(:name)).to eq(["Look Alpha"])

    TenantSwitcher.switch!(tenant_b_schema)
    expect(Look.pluck(:name)).to eq(["Look Beta"])
  end

  it "keeps leads isolated between tenant schemas" do
    TenantSwitcher.switch!(tenant_a_schema)
    Lead.create!(name: "Comprador Alpha", email: "alpha@example.com", source: "storefront")

    TenantSwitcher.switch!(tenant_b_schema)
    Lead.create!(name: "Comprador Beta", email: "beta@example.com", source: "whatsapp")

    TenantSwitcher.switch!(tenant_a_schema)
    expect(Lead.pluck(:email)).to eq(["alpha@example.com"])

    TenantSwitcher.switch!(tenant_b_schema)
    expect(Lead.pluck(:email)).to eq(["beta@example.com"])
  end

  it "keeps orders and line items isolated between tenant schemas" do
    TenantSwitcher.switch!(tenant_a_schema)
    alpha_member = create_member!(cpf: "11144477735", email: "alpha@example.com")
    alpha_order = Order.create!(member_id: alpha_member.id, status: "pending")
    alpha_order.order_items.create!(product_name: "Produto Alpha", qty: 2, unit_price: 10, subtotal: 20)
    alpha_order.recalculate_totals!

    TenantSwitcher.switch!(tenant_b_schema)
    beta_member = create_member!(cpf: "52998224725", email: "beta@example.com")
    beta_order = Order.create!(member_id: beta_member.id, status: "confirmed")
    beta_order.order_items.create!(product_name: "Produto Beta", qty: 5, unit_price: 12, subtotal: 60)
    beta_order.recalculate_totals!

    TenantSwitcher.switch!(tenant_a_schema)
    expect(Order.count).to eq(1)
    expect(Order.first.order_items.pluck(:product_name)).to eq(["Produto Alpha"])
    expect(Order.first.total_units).to eq(2)

    TenantSwitcher.switch!(tenant_b_schema)
    expect(Order.count).to eq(1)
    expect(Order.first.order_items.pluck(:product_name)).to eq(["Produto Beta"])
    expect(Order.first.total_units).to eq(5)
  end

  def create_member!(cpf:, email:)
    Member.create!(
      cpf: cpf,
      full_name: "Lojista #{cpf}",
      email: email,
      password: "password123",
      status: "active",
      plan_status: "active",
      association_date: Date.current
    )
  end
end
