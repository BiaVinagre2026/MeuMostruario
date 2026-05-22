# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Admin::Photos", type: :request do
  let!(:tenant) { provision_test_tenant }
  let(:headers) { tenant_headers(tenant) }

  before do
    allow_any_instance_of(Api::V1::Admin::PhotosController)
      .to receive(:require_operator_auth!)
      .and_return(true)
  end

  it "applies suggested sku, color and size group to link the product and variant" do
    fixture = within_tenant(tenant) do
      product = Product.create!(
        name: "Conjunto Shape Short",
        slug: "conjunto-shape-short-#{SecureRandom.hex(3)}",
        description: "Modelo demo",
        price_wholesale: 129.9,
        price_retail: 259.9,
        currency: "BRL",
        sku: "FIT-101",
        status: "published"
      )
      variant = product.variants.create!(
        size: "P/M",
        color: "Preto",
        size_group: "P/M",
        stock_qty: 10
      )
      batch = PhotoBatch.create!(name: "Lote Demo", status: "review")
      photo = batch.photos.create!(
        original_filename: "WhatsApp Image 2026-04-28 at 16.58.06 (3).jpeg",
        status: "needs_review",
        suggested_color: "Preto",
        suggested_pantone: "PANTONE 20-5603 TPX",
        suggested_model: "Conjunto Shape Short",
        suggested_size_group: "P/M",
        confidence_score: 0.91,
        metadata: {
          "suggested_sku" => "FIT-101",
          "suggestion_source" => "local_filename_grouping"
        },
        urls: {
          "original" => "/uploads/spec/catalogo-004.jpeg",
          "thumb" => "/uploads/spec/catalogo-004.jpeg"
        }
      )

      { product: product, variant: variant, photo: photo }
    end

    patch "/api/v1/admin/photos/bulk_update",
          params: {
            photo_ids: [fixture[:photo].id],
            apply_suggestions: true
          },
          headers: headers

    expect(response).to have_http_status(:ok)

    within_tenant(tenant) do
      photo = fixture[:photo].reload

      expect(photo.status).to eq("approved")
      expect(photo.product_id).to eq(fixture[:product].id)
      expect(photo.product_variant_id).to eq(fixture[:variant].id)
      expect(photo.approved_color).to eq("Preto")
      expect(photo.approved_model).to eq("Conjunto Shape Short")
      expect(photo.approved_size_group).to eq("P/M")
      expect(photo.product.images.find_by(photo_id: photo.id)).to be_present
    end
  end
end
