# frozen_string_literal: true

require "rails_helper"

# Tenant isolation spec
#
# Verifies the core security invariant of the schema-per-tenant architecture:
# data created within one tenant's schema is invisible when queried from another
# tenant's schema.
#
# Each test provisions real schemas via TenantProvisioner so that the AR models
# (Look, Lead, Order, Product, Category) resolve to the correct schema-scoped
# tables. DDL and DML within a transaction are rolled back by transactional
# fixtures.
RSpec.describe "Tenant Schema Isolation", type: :service do
  let(:tenant_a) { provision_tenant(slug: "iso-alpha-#{SecureRandom.hex(3)}") }
  let(:tenant_b) { provision_tenant(slug: "iso-beta-#{SecureRandom.hex(3)}") }

  before do
    tenant_a
    tenant_b
  end

  after do
    [tenant_a, tenant_b].each do |t|
      ActiveRecord::Base.connection.execute(
        "DROP SCHEMA IF EXISTS #{ActiveRecord::Base.connection.quote_column_name(t.schema_name)} CASCADE"
      )
    rescue StandardError => e
      Rails.logger.warn("Cleanup error: #{e.message}")
    end
  end

  # ---------------------------------------------------------------------------
  # Looks
  # ---------------------------------------------------------------------------
  describe "Look isolation" do
    it "look created in tenant_a is invisible in tenant_b" do
      with_tenant(tenant_a) { Look.create!(name: "Summer Look Alpha") }

      with_tenant(tenant_b) do
        expect(Look.count).to eq(0)
      end
    end

    it "published look for tenant_a is not returned when querying as tenant_b" do
      with_tenant(tenant_a) { Look.create!(name: "Exclusive Look", status: "published") }

      with_tenant(tenant_b) do
        expect(Look.published.count).to eq(0)
      end
    end

    it "each tenant can have a look with the same slug" do
      with_tenant(tenant_a) { Look.create!(name: "Summer Look") }
      with_tenant(tenant_b) { Look.create!(name: "Summer Look") }

      with_tenant(tenant_a) { expect(Look.count).to eq(1) }
      with_tenant(tenant_b) { expect(Look.count).to eq(1) }
    end
  end

  # ---------------------------------------------------------------------------
  # Leads
  # ---------------------------------------------------------------------------
  describe "Lead isolation" do
    it "lead submitted on tenant_a is invisible in tenant_b" do
      with_tenant(tenant_a) do
        Lead.create!(email: "buyer@alfa.com", source: "storefront", status: "new")
      end

      with_tenant(tenant_b) do
        expect(Lead.count).to eq(0)
      end
    end

    it "lead count is independently tracked per tenant" do
      with_tenant(tenant_a) do
        Lead.create!(phone: "11999990001", source: "whatsapp", status: "new")
        Lead.create!(phone: "11999990002", source: "whatsapp", status: "new")
      end

      with_tenant(tenant_b) do
        Lead.create!(phone: "21999990001", source: "storefront", status: "new")
      end

      with_tenant(tenant_a) { expect(Lead.count).to eq(2) }
      with_tenant(tenant_b) { expect(Lead.count).to eq(1) }
    end
  end

  # ---------------------------------------------------------------------------
  # Orders
  # ---------------------------------------------------------------------------
  describe "Order isolation" do
    def create_order_in(tenant, member_id: 1)
      with_tenant(tenant) do
        order = Order.create!(member_id: member_id, status: "pending", total_units: 1, total_value: 100)
        order.order_items.create!(
          product_name: "Calça Slim",
          qty: 1,
          unit_price: 100,
          subtotal: 100
        )
        order
      end
    end

    it "order created in tenant_a is invisible in tenant_b" do
      create_order_in(tenant_a, member_id: 1)

      with_tenant(tenant_b) do
        expect(Order.count).to eq(0)
      end
    end

    it "member from tenant_a cannot retrieve orders scoped to tenant_b" do
      create_order_in(tenant_a, member_id: 42)
      create_order_in(tenant_b, member_id: 42)

      with_tenant(tenant_a) { expect(Order.for_member(42).count).to eq(1) }
      with_tenant(tenant_b) { expect(Order.for_member(42).count).to eq(1) }
    end

    it "total order count is independent per tenant" do
      3.times { |i| create_order_in(tenant_a, member_id: i + 1) }
      create_order_in(tenant_b, member_id: 99)

      with_tenant(tenant_a) { expect(Order.count).to eq(3) }
      with_tenant(tenant_b) { expect(Order.count).to eq(1) }
    end
  end
end
