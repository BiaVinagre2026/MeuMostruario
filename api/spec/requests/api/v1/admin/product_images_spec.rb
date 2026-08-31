# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Admin::ProductImages", type: :request do
  let!(:tenant) { provision_test_tenant }
  let(:headers) { tenant_headers(tenant) }
  let!(:fixture) do
    within_tenant(tenant) do
      product = Product.create!(
        name: "Conjunto Coral",
        slug: "conjunto-coral-#{SecureRandom.hex(3)}",
        price_retail: 249.9,
        currency: "BRL",
        status: "published"
      )
      front = product.images.create!(
        urls: { "original" => "/uploads/frente.jpg", "regular" => "/uploads/frente.jpg" },
        alt_text: "Frente",
        is_cover: true,
        position: 1
      )
      back = product.images.create!(
        urls: { "original" => "/uploads/costas.jpg", "regular" => "/uploads/costas.jpg" },
        position: 2
      )
      { product: product, front: front, back: back }
    end
  end

  before do
    allow_any_instance_of(Api::V1::Admin::ProductImagesController)
      .to receive(:require_operator_auth!)
      .and_return(true)
  end

  it "updates the image role and cover without creating a duplicate" do
    patch "/api/v1/admin/products/#{fixture[:product].id}/images/#{fixture[:back].id}",
          params: { image: { alt_text: "Costas", is_cover: true } },
          headers: headers

    expect(response).to have_http_status(:ok)

    within_tenant(tenant) do
      expect(fixture[:product].images.count).to eq(2)
      expect(fixture[:front].reload).not_to be_is_cover
      expect(fixture[:back].reload).to be_is_cover
      expect(fixture[:back].alt_text).to eq("Costas")
    end
  end

  it "publishes the image role in the storefront product payload" do
    get "/api/v1/products/#{fixture[:product].slug}", headers: headers

    expect(response).to have_http_status(:ok)
    expect(json_response.dig("product", "images").map { |image| image["alt_text"] })
      .to contain_exactly("Frente", nil)
  end
end
