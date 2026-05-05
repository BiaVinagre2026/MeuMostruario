# frozen_string_literal: true

# WhatsappService
#
# Builds a wa.me deep-link pre-populated with an order summary message.
# The phone number comes from tenant_config.social_whatsapp, which stores
# the raw number (e.g. "5511999998888") or a wa.me URL.
class WhatsappService
  BRL_FORMAT = "R$ %.2f"

  # @param order        [Order]        persisted order with order_items loaded
  # @param member       [Member]       the member who placed the order
  # @param tenant_config [TenantConfig] used to resolve the WhatsApp number
  # @return [String, nil] wa.me URL, or nil when no number is configured
  def self.order_url(order:, member:, tenant_config:)
    phone = extract_phone(tenant_config)
    return nil if phone.blank?

    text = build_message(order, member, tenant_config)
    "https://wa.me/#{phone}?text=#{CGI.escape(text)}"
  end

  # ---------------------------------------------------------------------------
  private
  # ---------------------------------------------------------------------------

  def self.extract_phone(tenant_config)
    raw = tenant_config&.social_whatsapp.to_s.strip
    return nil if raw.blank?

    # Accept either "5511999998888" or "https://wa.me/5511999998888"
    raw.gsub(/\Ahttps?:\/\/wa\.me\//, "").gsub(/\D/, "")
  end

  def self.build_message(order, member, tenant_config)
    company = tenant_config&.company_name.presence || "MeuMostruário"
    lines   = []

    lines << "Novo Pedido — #{company}"
    lines << ""
    lines << "Pedido ##{order.id} | Cliente: #{member.full_name}"
    lines << ""
    lines << "Itens:"

    # Group items by product+color so each line shows the full size grid
    grouped = group_items(order.order_items)
    grouped.each do |entry|
      grade_str = entry[:sizes].map { |s, q| "#{s}x#{q}" }.join(" ")
      subtotal  = format_brl(entry[:subtotal])
      lines << "- #{entry[:product_name]} — #{entry[:color]} — #{grade_str} — #{subtotal}"
    end

    lines << ""

    metadata = order.metadata || {}
    subtotal_val   = metadata["subtotal"].to_d
    discount_val   = metadata["discount"].to_d
    discount_pct   = metadata["discount_pct"].to_i
    total_val      = order.total_value

    lines << "Subtotal: #{format_brl(subtotal_val)}"

    if discount_val.positive?
      lines << "Desconto (#{discount_pct}%): -#{format_brl(discount_val)}"
    end

    lines << "Total: #{format_brl(total_val)}"
    lines << ""
    lines << "Aguardo confirmacao!"

    lines.join("\n")
  end

  def self.group_items(order_items)
    order_items.each_with_object([]) do |item, acc|
      existing = acc.find { |e| e[:product_name] == item.product_name && e[:color] == item.color }
      if existing
        existing[:sizes][item.size.to_s] = item.qty
        existing[:subtotal] += item.subtotal.to_d
      else
        acc << {
          product_name: item.product_name,
          color:        item.color.to_s,
          sizes:        { item.size.to_s => item.qty },
          subtotal:     item.subtotal.to_d
        }
      end
    end
  end

  def self.format_brl(value)
    format(BRL_FORMAT, value.to_d).tr(".", ",")
  end
end
