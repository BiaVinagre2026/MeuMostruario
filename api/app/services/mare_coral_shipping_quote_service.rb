# frozen_string_literal: true

# The first drop uses a tenant-owned flat-rate policy. Configuration lives on
# the opted-in Maré Coral catalog link, so no other tenant is affected.
class MareCoralShippingQuoteService
  class ValidationError < StandardError; end

  Quote = Struct.new(:configured, :amount, :method, :estimated_days, keyword_init: true) do
    def as_json(*)
      {
        configured: configured,
        amount: amount,
        method: method,
        estimated_days: estimated_days
      }
    end
  end

  def initialize(catalog_link:)
    @catalog_link = catalog_link
  end

  def quote(postal_code:, subtotal:)
    validate_postal_code!(postal_code)
    shipping = storefront_settings.fetch("shipping", {})

    unless shipping["enabled"] == true && !shipping["flat_rate"].nil?
      return Quote.new(configured: false, amount: 0.to_d, method: "Frete a combinar", estimated_days: nil)
    end

    flat_rate = decimal(shipping["flat_rate"], "valor do frete")
    threshold = optional_decimal(shipping["free_shipping_threshold"], "limite de frete gratis")
    amount = threshold&.positive? && subtotal.to_d >= threshold ? 0.to_d : flat_rate

    Quote.new(
      configured: true,
      amount: amount,
      method: amount.zero? ? "Frete gratis" : "Entrega nacional",
      estimated_days: shipping["estimated_days"].to_i.positive? ? shipping["estimated_days"].to_i : 7
    )
  end

  private

  def storefront_settings
    @catalog_link.metadata.to_h.fetch("retail_storefront", {})
  end

  def validate_postal_code!(value)
    digits = value.to_s.gsub(/\D/, "")
    raise ValidationError, "CEP deve ter 8 digitos" unless digits.match?(/\A\d{8}\z/)
  end

  def decimal(value, label)
    number = BigDecimal(value.to_s)
    raise ArgumentError if number.negative?
    number
  rescue ArgumentError
    raise ValidationError, "#{label} invalido"
  end

  def optional_decimal(value, label)
    return nil if value.blank?
    decimal(value, label)
  end
end
