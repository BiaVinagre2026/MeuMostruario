# frozen_string_literal: true

module Public
  class LojistasController < BaseController
    before_action :require_member_login!

    def index
      @collections = Collection.where(status: "published").order(:position).to_a
      @products    = Product
        .where(status: "published")
        .includes(:images, :variants, :collection)
        .order(:position)
        .to_a
    end

    # POST /pedido
    # Receives JSON from the lojistas storefront and persists the B2B order.
    # current_member in this context is a raw hash from BaseController; use
    # session[:member_id] directly as the member_id.
    def create
      raw_items = params[:items]
      unless raw_items.is_a?(Array) && raw_items.any?
        return render json: { error: "Pedido sem itens" }, status: :unprocessable_entity
      end

      items = raw_items.map do |i|
        {
          product_id:   i[:product_id].presence,
          product_name: i[:product_name].to_s.strip,
          product_sku:  i[:product_sku].to_s.presence,
          color:        i[:color].to_s.presence,
          size:         i[:size].to_s.presence,
          qty:          i[:qty].to_i,
          unit_price:   i[:unit_price].to_d
        }
      end

      order = OrderBuilderService.build(
        member_id: session[:member_id].to_i,
        items:     items,
        notes:     params[:notes].to_s.strip.presence
      )

      render json: { order_id: order.id, status: order.status }, status: :created
    rescue ActiveRecord::RecordInvalid => e
      render json: { error: e.record.errors.full_messages.join(", ") },
             status: :unprocessable_entity
    end
  end
end
