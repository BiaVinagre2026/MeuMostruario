# frozen_string_literal: true

class OrderBuilderService
  # Builds and persists an Order with its OrderItems inside a single transaction.
  #
  # @param member_id [Integer] ID of the authenticated member placing the order
  # @param items     [Array<Hash>] each hash must include:
  #   product_id, product_name, product_sku, color, size, qty, unit_price
  # @param notes     [String, nil] optional free-text notes from the member
  # @return          [Order] persisted order with items and recalculated totals
  def self.build(member_id:, items:, notes: nil)
    ActiveRecord::Base.transaction do
      order = Order.create!(
        member_id: member_id,
        status:    "pending",
        notes:     notes
      )

      valid_items = Array(items).select { |i| i[:qty].to_i > 0 }

      valid_items.each do |item|
        order.order_items.create!(
          product_id:   item[:product_id].presence,
          product_name: item[:product_name].to_s.strip,
          product_sku:  item[:product_sku].to_s.presence,
          color:        item[:color].to_s.presence,
          size:         item[:size].to_s.presence,
          qty:          item[:qty].to_i,
          unit_price:   item[:unit_price].to_d
        )
      end

      order.recalculate_totals!
      order
    end
  end
end
