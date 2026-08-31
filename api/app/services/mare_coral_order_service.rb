# frozen_string_literal: true

class MareCoralOrderService
  class ValidationError < StandardError; end

  Result = Struct.new(:order, :payment, :quote, keyword_init: true)
  REQUIRED_ADDRESS_FIELDS = %i[postal_code street number neighborhood city state].freeze

  def initialize(tenant:, catalog_link:, config:)
    @tenant = tenant
    @catalog_link = catalog_link
    @config = config
  end

  def create!(buyer:, shipping_address:, items:, notes: nil, payment_method: "pix")
    validate_scope!
    normalized_buyer = normalize_buyer(buyer)
    normalized_address = normalize_address(shipping_address)

    order = nil
    quote = nil
    Order.transaction do
      lines = MareCoralCartService.new(catalog_link: @catalog_link, items: items).resolve!
      subtotal = lines.sum(&:subtotal)
      quote = MareCoralShippingQuoteService.new(catalog_link: @catalog_link).quote(
        postal_code: normalized_address[:postal_code],
        subtotal: subtotal
      )
      validate_payment_readiness!(normalized_buyer, quote, payment_method)

      order = Order.create!(
        catalog_link: @catalog_link,
        buyer_name: normalized_buyer[:name],
        buyer_email: normalized_buyer[:email],
        buyer_phone: normalized_buyer[:phone],
        buyer_document: normalized_buyer[:document],
        status: "pending",
        payment_status: "not_required",
        notes: notes,
        total_units: lines.sum { |line| line.qty.to_i },
        total_value: subtotal + quote.amount.to_d,
        metadata: {
          "channel" => "retail_storefront",
          "tenant_slug" => "mare-coral",
          "items_subtotal" => subtotal.to_s("F"),
          "shipping" => quote.as_json.stringify_keys,
          "shipping_address" => normalized_address.stringify_keys
        }
      )

      lines.each do |line|
        order.order_items.create!(
          product: line.product,
          product_name: line.product.name,
          product_sku: line.variant.sku.presence || line.product.sku,
          color: line.variant.color,
          size: line.variant.size.presence || line.variant.size_group,
          qty: line.qty,
          unit_price: line.unit_price,
          metadata: {
            "catalog_item_id" => line.catalog_item.id,
            "variant_id" => line.variant.id,
            "image_url" => line.variant.image_url.presence || line.product.cover_image&.original_url
          }.compact
        )
      end

      MareCoralInventoryService.reserve!(order: order, lines: lines)
    end

    payment = if @catalog_link.allow_payment?
      GatewayPaymentService.new(config: @config).create_intent!(order: order, payment_method: payment_method)
    end

    Result.new(order: order.reload, payment: payment, quote: quote)
  rescue MareCoralCartService::ValidationError,
         MareCoralShippingQuoteService::ValidationError,
         MareCoralInventoryService::StockError => e
    raise ValidationError, e.message
  end

  private

  def validate_scope!
    settings = @catalog_link.metadata.to_h["retail_storefront"]
    unless @tenant&.slug == "mare-coral" && settings.is_a?(Hash) && settings["enabled"] == true
      raise ValidationError, "vitrine varejista nao autorizada"
    end
    raise ValidationError, "este link nao permite pedido" unless @catalog_link.allow_order?
  end

  def normalize_buyer(buyer)
    values = buyer.to_h.symbolize_keys.slice(:name, :email, :phone, :document)
    %i[name email phone].each do |field|
      raise ValidationError, "dados do comprador incompletos" if values[field].blank?
    end

    document = values[:document].to_s
    if document.present? && !DocumentValidator.valid?(document)
      raise ValidationError, "CPF ou CNPJ invalido"
    end
    values[:document] = document.present? ? DocumentValidator.clean(document) : nil
    values
  end

  def normalize_address(address)
    values = address.to_h.symbolize_keys.slice(*REQUIRED_ADDRESS_FIELDS, :complement)
    REQUIRED_ADDRESS_FIELDS.each do |field|
      raise ValidationError, "endereco de entrega incompleto" if values[field].blank?
    end

    digits = values[:postal_code].to_s.gsub(/\D/, "")
    raise ValidationError, "CEP deve ter 8 digitos" unless digits.match?(/\A\d{8}\z/)
    state = values[:state].to_s.upcase
    raise ValidationError, "UF deve ter 2 letras" unless state.match?(/\A[A-Z]{2}\z/)

    values.merge(postal_code: digits, state: state)
  end

  def validate_payment_readiness!(buyer, quote, payment_method)
    return unless @catalog_link.allow_payment?

    raise ValidationError, "informe o CPF ou CNPJ do comprador" if buyer[:document].blank?
    raise ValidationError, "configure o frete antes de ativar o pagamento" unless quote.configured
    raise ValidationError, "configure as credenciais do gateway antes de ativar o pagamento" unless @config&.psp_configured?
    raise ValidationError, "metodo de pagamento ainda nao disponivel" unless payment_method.to_s == "pix"
  end
end
