# frozen_string_literal: true

# OrderBuilderService
#
# Builds and persists an Order with its OrderItems inside a single transaction.
#
# Supports two item payload shapes:
#
# 1. Legacy (one item per size):
#    { product_id:, product_name:, product_sku:, color:, size:, qty:, unit_price: }
#
# 2. New wholesale payload (grade por tamanho):
#    { product_id:, product_name:, sku:, color:, color_hex:, image_url:,
#      price:, qty: { "PP" => 2, "P" => 2, "M" => 2 }, total: }
#
# The service detects the shape by checking whether `qty` is a Hash.
class OrderBuilderService
  # @param member_id    [Integer]         authenticated member ID
  # @param items        [Array<Hash>]     cart line items (see shapes above)
  # @param notes        [String, nil]     optional buyer notes
  # @param subtotal     [Numeric, nil]    pre-discount subtotal from frontend
  # @param discount     [Numeric, nil]    discount amount
  # @param discount_pct [Integer, nil]    discount percentage (e.g. 5)
  # @param total        [Numeric, nil]    final total after discount
  # @return [Order] persisted order with items loaded
  def self.build(member_id:, items:, notes: nil, subtotal: nil, discount: nil, discount_pct: nil, total: nil)
    ActiveRecord::Base.transaction do
      order = Order.create!(
        member_id: member_id,
        status:    "pending",
        notes:     notes,
        metadata:  build_order_metadata(subtotal, discount, discount_pct, total)
      )

      Array(items).each do |raw_item|
        item = raw_item.is_a?(Hash) ? raw_item.symbolize_keys : raw_item.to_unsafe_h.symbolize_keys

        if item[:qty].is_a?(Hash)
          build_graded_items(order, item)
        else
          build_single_item(order, item)
        end
      end

      order.recalculate_totals!

      # Override total_value with the frontend-supplied total when a discount
      # was applied — recalculate_totals! sums raw line subtotals (pre-discount).
      if discount.to_d.positive? && total.present?
        order.update_column(:total_value, total.to_d)
      end

      order.reload
    end
  end

  # ---------------------------------------------------------------------------
  private
  # ---------------------------------------------------------------------------

  # Wholesale payload: qty is a hash of { size => quantity }
  # Creates one OrderItem per size/quantity pair that has qty > 0.
  def self.build_graded_items(order, item)
    qty_hash   = item[:qty]
    unit_price = item[:price].to_d
    product_id = item[:product_id].presence
    name       = item[:product_name].to_s.strip
    sku        = (item[:sku] || item[:product_sku]).to_s.presence
    color      = item[:color].to_s.presence
    color_hex  = item[:color_hex].to_s.presence
    image_url  = item[:image_url].to_s.presence

    qty_hash.each do |size, qty|
      next if qty.to_i <= 0

      order.order_items.create!(
        product_id:   product_id,
        product_name: name,
        product_sku:  sku,
        color:        color,
        size:         size.to_s,
        qty:          qty.to_i,
        unit_price:   unit_price,
        metadata:     compact_metadata(color_hex: color_hex, image_url: image_url)
      )
    end
  end

  # Legacy payload: qty is a scalar integer, one item per call.
  def self.build_single_item(order, item)
    return if item[:qty].to_i <= 0

    order.order_items.create!(
      product_id:   item[:product_id].presence,
      product_name: item[:product_name].to_s.strip,
      product_sku:  item[:product_sku].to_s.presence,
      color:        item[:color].to_s.presence,
      size:         item[:size].to_s.presence,
      qty:          item[:qty].to_i,
      unit_price:   item[:unit_price].to_d,
      metadata:     {}
    )
  end

  def self.build_order_metadata(subtotal, discount, discount_pct, total)
    {
      "subtotal"     => subtotal.to_d.to_s,
      "discount"     => discount.to_d.to_s,
      "discount_pct" => discount_pct.to_i,
      "total"        => total.to_d.to_s
    }.compact
  end

  def self.compact_metadata(**kwargs)
    kwargs.each_with_object({}) do |(k, v), h|
      h[k.to_s] = v if v.present?
    end
  end
end
