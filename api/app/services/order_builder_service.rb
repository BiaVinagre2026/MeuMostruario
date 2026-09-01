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
  # O dinheiro NUNCA vem da requisicao.
  #
  # Antes o total enviado pelo cliente sobrescrevia o total calculado sempre que
  # viesse com desconto. Media: um pedido de R$ 318 fechava por R$ 1,00 e a
  # cobranca saia por R$ 1,00, porque bastava mandar `discount: 0.01` junto.
  # As linhas ja estavam certas e o total recalculado tambem — a ultima linha
  # jogava tudo fora. Agora subtotal, desconto e total sao derivados aqui, das
  # linhas gravadas, e a requisicao nao tem voz nenhuma sobre valor.
  #
  # @param member_id    [Integer, nil]    authenticated member ID when available
  # @param catalog_link [CatalogLink, nil] tokenized catalog link for anonymous wholesale orders
  # @param buyer        [Hash]            anonymous buyer snapshot
  # @param items        [Array<Hash>]     cart line items (see shapes above)
  # @param notes        [String, nil]     optional buyer notes
  # @param volume_discount [Boolean]      aplica a faixa de desconto por volume
  #   do atacado. Ligado no carrinho do showroom, que tem a funcionalidade;
  #   desligado no link de atacado, que vende pelo preco cheio da tabela.
  # @return [Order] persisted order with items loaded
  def self.build(member_id: nil, catalog_link: nil, buyer: {}, items:, notes: nil, volume_discount: false, payment_status: nil)
    ActiveRecord::Base.transaction do
      order = Order.create!(
        member_id: member_id,
        catalog_link_id: catalog_link&.id,
        buyer_name: buyer[:name] || buyer["name"],
        buyer_phone: buyer[:phone] || buyer["phone"],
        buyer_email: buyer[:email] || buyer["email"],
        # Guardado so com digitos: e nesse formato que o PSP espera receber.
        buyer_document: DocumentValidator.clean(buyer[:document] || buyer["document"]).presence,
        status: "pending",
        payment_status: payment_status || (catalog_link&.allow_payment? ? "pending" : "not_required"),
        notes: notes,
        metadata: { "catalog_link_token" => catalog_link&.token,
                    "catalog_link_type" => catalog_link&.link_type }.compact
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
      apply_pricing!(order, volume_discount)

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
    product_id = item[:product_id].presence
    unit_price = resolve_unit_price(product_id, item[:price])
    name       = item[:product_name].to_s.strip
    sku        = (item[:sku] || item[:product_sku]).to_s.presence
    color      = item[:color].to_s.presence
    color_hex  = item[:color_hex].to_s.presence
    pantone    = item[:pantone].to_s.presence
    image_url  = item[:image_url].to_s.presence
    photo_id   = item[:photo_id].presence
    catalog_item_id = item[:catalog_item_id].presence

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
        metadata:     compact_metadata(
          color_hex: color_hex,
          pantone: pantone,
          image_url: image_url,
          photo_id: photo_id,
          catalog_item_id: catalog_item_id
        )
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
      unit_price:   resolve_unit_price(item[:product_id].presence, item[:unit_price]),
      metadata:     compact_metadata(
        color_hex: item[:color_hex],
        pantone: item[:pantone],
        image_url: item[:image_url],
        photo_id: item[:photo_id],
        catalog_item_id: item[:catalog_item_id]
      )
    )
  end

  # Deriva subtotal, desconto e total das linhas ja gravadas.
  #
  # recalculate_totals! soma as linhas pelo preco unitario resolvido no banco:
  # esse e o subtotal. O desconto sai da faixa por volume, decidida pela
  # quantidade de pecas, e o total e a diferenca. Nenhum dos tres passa pela
  # requisicao.
  def self.apply_pricing!(order, volume_discount)
    subtotal = order.total_value.to_d
    pct      = volume_discount ? OrderPricing.discount_pct_for(order.total_units) : 0
    desconto = (subtotal * pct / 100).round(2)
    total    = subtotal - desconto

    order.update!(
      total_value: total,
      metadata: order.metadata.to_h.merge(
        "subtotal"     => subtotal.to_s,
        "discount"     => desconto.to_s,
        "discount_pct" => pct,
        "total"        => total.to_s
      )
    )
  end

  # O preco de uma peca do catalogo e o que esta no banco.
  #
  # O valor enviado so vale para linha sem produto — item avulso digitado a mao,
  # que nao tem tabela de onde tirar preco.
  def self.resolve_unit_price(product_id, enviado)
    return enviado.to_d if product_id.blank?

    produto = Product.find_by(id: product_id)
    return enviado.to_d if produto.nil?

    produto.price_wholesale.to_d
  end

  def self.compact_metadata(**kwargs)
    kwargs.each_with_object({}) do |(k, v), h|
      h[k.to_s] = v if v.present?
    end
  end
end
