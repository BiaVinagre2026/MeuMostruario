# frozen_string_literal: true

require "rails_helper"

RSpec.describe TenantSwitcher do
  let(:schema_name) { "tenant_test_switcher_#{SecureRandom.hex(4)}" }

  before do
    ActiveRecord::Base.connection.execute("CREATE SCHEMA IF NOT EXISTS #{schema_name}")
  end

  after do
    TenantSwitcher.reset!
    ActiveRecord::Base.connection.execute("DROP SCHEMA IF EXISTS #{schema_name} CASCADE")
  end

  describe ".switch!" do
    it "sets the search_path to the given schema" do
      TenantSwitcher.switch!(schema_name)
      expect(TenantSwitcher.current_schema).to include(schema_name)
    end

    it "allows switching to different schemas sequentially" do
      other_schema = "tenant_test_switcher_other_#{SecureRandom.hex(4)}"
      ActiveRecord::Base.connection.execute("CREATE SCHEMA IF NOT EXISTS #{other_schema}")

      TenantSwitcher.switch!(schema_name)
      expect(TenantSwitcher.current_schema).to include(schema_name)

      TenantSwitcher.switch!(other_schema)
      expect(TenantSwitcher.current_schema).to include(other_schema)
    ensure
      ActiveRecord::Base.connection.execute("DROP SCHEMA IF EXISTS #{other_schema} CASCADE")
    end
  end

  describe ".reset!" do
    it "restores search_path to public" do
      TenantSwitcher.switch!(schema_name)
      TenantSwitcher.reset!
      expect(TenantSwitcher.current_schema).to eq("public")
    end
  end

  describe ".current_schema" do
    it "returns public by default" do
      TenantSwitcher.reset!
      expect(TenantSwitcher.current_schema).to eq("public")
    end
  end

  describe ".switch (block form)" do
    let(:tenant) do
      Tenant.new(name: "Test", slug: "test-sw", plan: "starter", status: "active").tap do |t|
        t.define_singleton_method(:active?) { true }
        t.define_singleton_method(:schema_name) { schema_name }
      end
    end

    it "switches to the tenant schema for the duration of the block" do
      schema_during_block = nil

      TenantSwitcher.switch(tenant) do
        schema_during_block = TenantSwitcher.current_schema
      end

      expect(schema_during_block).to include(schema_name)
      expect(TenantSwitcher.current_schema).not_to include(schema_name)
    end

    it "restores the previous search_path even if the block raises" do
      expect do
        TenantSwitcher.switch(tenant) { raise "boom" }
      end.to raise_error("boom")

      expect(TenantSwitcher.current_schema).not_to include(schema_name)
    end

    it "raises TenantNotFound when tenant is nil" do
      expect { TenantSwitcher.switch(nil) {} }.to raise_error(TenantSwitcher::TenantNotFound)
    end

    it "raises TenantNotFound when tenant is not active" do
      inactive = Tenant.new
      inactive.define_singleton_method(:active?) { false }
      expect { TenantSwitcher.switch(inactive) {} }.to raise_error(TenantSwitcher::TenantNotFound)
    end
  end
end
