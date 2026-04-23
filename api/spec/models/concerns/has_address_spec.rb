# frozen_string_literal: true

require "rails_helper"

RSpec.describe HasAddress do
  let(:dummy_class) do
    Class.new do
      include HasAddress

      attr_accessor :address

      def respond_to?(method, *)
        method == :address || super
      end
    end
  end

  let(:instance) { dummy_class.new }

  describe "#valid_address?" do
    it "returns true when all required fields are present" do
      instance.address = {
        "street" => "Rua A",
        "street_number" => "123",
        "neighborhood" => "Centro",
        "city" => "Sao Paulo",
        "state" => "SP",
        "zip_code" => "01001000"
      }
      expect(instance.valid_address?).to be true
    end

    it "returns false when a required field is missing" do
      instance.address = {
        "street" => "Rua A",
        "street_number" => "123",
        "neighborhood" => "Centro",
        "city" => "Sao Paulo",
        "state" => "SP"
        # missing zip_code
      }
      expect(instance.valid_address?).to be false
    end

    it "returns false when address is nil" do
      instance.address = nil
      expect(instance.valid_address?).to be false
    end

    it "returns false when address is not a Hash" do
      instance.address = "not a hash"
      expect(instance.valid_address?).to be false
    end

    it "accepts symbol keys" do
      instance.address = {
        street: "Rua A",
        street_number: "123",
        neighborhood: "Centro",
        city: "Sao Paulo",
        state: "SP",
        zip_code: "01001000"
      }
      expect(instance.valid_address?).to be true
    end
  end

  describe "#normalize_address" do
    it "strips whitespace from string values" do
      result = instance.normalize_address({ "street" => "  Rua A  ", "city" => " SP " })
      expect(result["street"]).to eq("Rua A")
      expect(result["city"]).to eq("SP")
    end

    it "removes non-digits from zip_code" do
      result = instance.normalize_address({ "zip_code" => "01.001-000" })
      expect(result["zip_code"]).to eq("01001000")
    end

    it "upcases state" do
      result = instance.normalize_address({ "state" => "sp" })
      expect(result["state"]).to eq("SP")
    end

    it "converts symbol keys to strings" do
      result = instance.normalize_address({ street: "Rua A" })
      expect(result).to have_key("street")
    end

    it "returns empty hash for nil input" do
      expect(instance.normalize_address(nil)).to eq({})
    end
  end

  describe "REQUIRED_ADDRESS_FIELDS" do
    it "includes all expected fields" do
      expect(HasAddress::REQUIRED_ADDRESS_FIELDS).to contain_exactly(
        "street", "street_number", "neighborhood", "city", "state", "zip_code"
      )
    end
  end

  describe "BRAZILIAN_STATES" do
    it "contains 27 states" do
      expect(HasAddress::BRAZILIAN_STATES.size).to eq(27)
    end
  end
end
