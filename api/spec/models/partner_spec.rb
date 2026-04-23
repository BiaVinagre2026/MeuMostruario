# frozen_string_literal: true

require "rails_helper"

RSpec.describe Partner, type: :model do
  describe "constants" do
    it "defines STATUSES" do
      expect(Partner::STATUSES).to contain_exactly(
        "pending_approval", "active", "inactive", "suspended", "rejected"
      )
      expect(Partner::STATUSES).to be_frozen
    end

    it "defines DOCUMENT_TYPES" do
      expect(Partner::DOCUMENT_TYPES).to contain_exactly("cpf", "cnpj")
      expect(Partner::DOCUMENT_TYPES).to be_frozen
    end
  end

  describe "predicates" do
    %w[active pending_approval suspended rejected inactive].each do |s|
      it "##{s}? returns true when status is #{s}" do
        partner = Partner.new
        allow(partner).to receive(:status).and_return(s)
        expect(partner.send(:"#{s}?")).to be true
      end
    end
  end

  describe "table_name" do
    it "uses public.partners" do
      expect(Partner.table_name).to eq("public.partners")
    end
  end
end
