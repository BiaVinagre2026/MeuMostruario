# frozen_string_literal: true

# A reservation immediately removes the units from stock_qty and keeps an
# auditable ledger in the order metadata. Cancelling restores exactly those
# variants. Only orders explicitly tagged as Maré Coral retail are accepted.
class MareCoralInventoryService
  class StockError < StandardError; end

  def self.reserve!(order:, lines:)
    ensure_mare_coral_order!(order)
    quantities = lines.to_h { |line| [line.variant.id, line.qty.to_i] }
    variants = locked_variants(quantities.keys)
    raise StockError, "uma variacao nao existe mais" unless variants.size == quantities.size

    quantities.each do |variant_id, qty|
      variant = variants.fetch(variant_id)
      next if variant.stock_qty.to_i >= qty

      label = [variant.product.name, variant.color, variant.size.presence || variant.size_group].compact.join(" · ")
      raise StockError, "estoque insuficiente para #{label}"
    end

    quantities.each do |variant_id, qty|
      variant = variants.fetch(variant_id)
      variant.update!(stock_qty: variant.stock_qty.to_i - qty)
    end

    inventory = {
      "state" => "reserved",
      "reserved_at" => Time.current.iso8601,
      "lines" => quantities.map { |variant_id, qty| { "variant_id" => variant_id, "qty" => qty } }
    }
    order.update!(metadata: order.metadata.to_h.merge("inventory" => inventory))
  end

  def self.commit!(order)
    return unless mare_coral_order?(order)

    order.with_lock do
      inventory = order.metadata.to_h.fetch("inventory", {})
      return if inventory["state"] == "committed"
      return unless inventory["state"] == "reserved"

      inventory["state"] = "committed"
      inventory["committed_at"] = Time.current.iso8601
      order.update!(metadata: order.metadata.to_h.merge("inventory" => inventory))
    end
  end

  def self.release!(order)
    return unless mare_coral_order?(order)

    order.with_lock do
      inventory = order.metadata.to_h.fetch("inventory", {})
      return if inventory["state"] == "released"
      return unless inventory["state"].in?(%w[reserved committed])

      quantities = Array(inventory["lines"]).each_with_object(Hash.new(0)) do |line, result|
        result[line["variant_id"].to_i] += line["qty"].to_i
      end
      variants = locked_variants(quantities.keys)
      quantities.each do |variant_id, qty|
        variant = variants[variant_id]
        variant&.update!(stock_qty: variant.stock_qty.to_i + qty)
      end

      inventory["state"] = "released"
      inventory["released_at"] = Time.current.iso8601
      order.update!(metadata: order.metadata.to_h.merge("inventory" => inventory))
    end
  end

  def self.mare_coral_order?(order)
    metadata = order.metadata.to_h
    metadata["channel"] == "retail_storefront" && metadata["tenant_slug"] == "mare-coral"
  end

  def self.ensure_mare_coral_order!(order)
    raise StockError, "pedido fora do canal autorizado" unless mare_coral_order?(order)
  end
  private_class_method :ensure_mare_coral_order!

  def self.locked_variants(ids)
    ProductVariant.unscoped.where(id: ids).order(:id).lock.index_by(&:id)
  end
  private_class_method :locked_variants
end
