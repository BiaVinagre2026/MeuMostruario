# frozen_string_literal: true

require "rails_helper"
load Rails.root.join("db/seeds/photo_catalog_demo.rb")

RSpec.describe SeedPhotoCatalogDemo do
  describe ".assignment_for_asset" do
    it "maps the black short editorial session to FIT-101" do
      asset = {
        original_filename: "WhatsApp Image 2026-04-28 at 16.58.06 (3).jpeg",
        url: "/uploads/demo/catalogo-004.jpeg"
      }

      assignment = described_class.assignment_for_asset(asset, 0)

      expect(assignment).to include(
        sku: "FIT-101",
        color: "Preto",
        size_group: "P/M",
        model_name: "Conjunto Shape Short"
      )
      expect(assignment[:pantone]).to start_with("PANTONE 20-")
    end

    it "maps the pink legging editorial session to FIT-102" do
      asset = {
        original_filename: "WhatsApp Image 2026-04-28 at 16.58.49 (2).jpeg",
        url: "/uploads/demo/catalogo-011.jpeg"
      }

      assignment = described_class.assignment_for_asset(asset, 2)

      expect(assignment).to include(
        sku: "FIT-102",
        color: "Rosa Energia",
        size_group: "P/M",
        model_name: "Conjunto Pulse Ombro Unico"
      )
    end

    it "alternates plus size groups for the vinho session" do
      asset = {
        original_filename: "WhatsApp Image 2026-04-28 at 16.59.55 (4).jpeg",
        url: "/uploads/demo/catalogo-034.jpeg"
      }

      plus_one = described_class.assignment_for_asset(asset, 0)
      plus_two = described_class.assignment_for_asset({ original_filename: "WhatsApp Image 2026-04-28 at 16.59.55 (5).jpeg", url: "/uploads/demo/catalogo-035.jpeg" }, 1)

      expect(plus_one).to include(
        sku: "FIT-103",
        color: "Vinho Intenso",
        size_group: "Plus 1",
        model_name: "Conjunto Pulse Legging Plus"
      )
      expect(plus_two[:size_group]).to eq("Plus 2")
    end
  end
end
