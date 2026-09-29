# frozen_string_literal: true

require "rails_helper"

RSpec.describe MareCoralShippingQuoteService do
  let(:shipping) { { "enabled" => true, "free_shipping_threshold" => "200.00", "origin_postal_code" => "24340140" } }
  let(:link) { double(metadata: { "retail_storefront" => { "shipping" => shipping } }) }
  subject(:service) { described_class.new(catalog_link: link) }

  it "libera frete grátis acima de R$ 200 mesmo sem tarifa paga" do
    quote = service.quote(postal_code: "24340-140", subtotal: "200.01")
    expect(quote.configured).to be(true)
    expect(quote.amount).to eq(0.to_d)
    expect(quote.method).to eq("Frete gratis")
    expect(quote.estimated_days).to be_nil
  end

  ["0", "139.90", "199.99", "200.00"].each do |subtotal|
    it "não promete frete zero para R$ #{subtotal} sem tarifa aprovada" do
      quote = service.quote(postal_code: "01001000", subtotal: subtotal)
      expect(quote.configured).to be(false)
      expect(quote.method).to eq("Frete a combinar")
    end
  end

  it "cobra a tarifa aprovada no limite exato e informa somente o prazo cadastrado" do
    shipping.merge!("flat_rate" => "24.90", "estimated_days" => 6)
    quote = service.quote(postal_code: "24340140", subtotal: "200.00")
    expect(quote.configured).to be(true)
    expect(quote.amount).to eq(24.9.to_d)
    expect(quote.estimated_days).to eq(6)
  end

  it "respeita a desativação da regra" do
    shipping["enabled"] = false
    expect(service.quote(postal_code: "24340140", subtotal: "300").configured).to be(false)
  end

  it "recusa CEP incompleto" do
    expect { service.quote(postal_code: "24340", subtotal: "300") }.to raise_error(described_class::ValidationError)
  end

  ["-1", "NaN", "Infinity"].each do |invalid|
    it "recusa valor de frete inválido #{invalid}" do
      shipping["flat_rate"] = invalid
      expect { service.quote(postal_code: "24340140", subtotal: "100") }.to raise_error(described_class::ValidationError)
    end
  end
end
