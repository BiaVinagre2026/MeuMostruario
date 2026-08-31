# frozen_string_literal: true

# Resolves the Maré Coral retail cart from the catalog behind the authorized
# link. Product membership, variation and price always come from the server.
class MareCoralCartService
  class ValidationError < StandardError; end

  ResolvedLine = Struct.new(
    :catalog_item, :product, :variant, :qty, :unit_price,
    keyword_init: true
  ) do
    def subtotal
      unit_price.to_d * qty.to_i
    end
  end

  def initialize(catalog_link:, items:)
    @catalog_link = catalog_link
    @items = Array(items)
  end

  def resolve!
    raise ValidationError, "a sacola esta vazia" if @items.empty?

    grouped = {}
    @items.each do |raw_item|
      item = normalize(raw_item)
      catalog_item = visible_catalog_items.find_by(id: item[:catalog_item_id])
      raise ValidationError, "item nao pertence a vitrine da Mare Coral" unless catalog_item&.product

      variant = catalog_item.product.variants.reorder(:id).find_by(id: item[:variant_id])
      raise ValidationError, "tamanho ou cor nao pertence ao produto selecionado" unless variant

      qty = positive_integer(item[:qty])
      price = variant.price_override.presence || catalog_item.product.price_retail
      raise ValidationError, "produto sem preco de varejo configurado" unless price.to_d.positive?

      if grouped[variant.id]
        grouped[variant.id].qty += qty
      else
        grouped[variant.id] = ResolvedLine.new(
          catalog_item: catalog_item,
          product: catalog_item.product,
          variant: variant,
          qty: qty,
          unit_price: price.to_d
        )
      end
    end

    grouped.values
  end

  private

  def visible_catalog_items
    @visible_catalog_items ||= @catalog_link.catalog.catalog_items.where(visible: true)
  end

  def normalize(raw_item)
    raw_item.respond_to?(:to_unsafe_h) ? raw_item.to_unsafe_h.with_indifferent_access : raw_item.to_h.with_indifferent_access
  end

  def positive_integer(value)
    qty = Integer(value, exception: false)
    raise ValidationError, "quantidade invalida" unless qty&.positive?

    qty
  end
end
