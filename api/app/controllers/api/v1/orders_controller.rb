# frozen_string_literal: true

module Api
  module V1
    class OrdersController < ApplicationController
      before_action :require_auth!

      # GET /api/v1/orders
      def index
        scope  = Order.for_member(current_member.id).includes(:order_items)
        orders = paginate(scope)
        render json: {
          orders: orders.map { |o| order_summary_json(o) },
          meta:   pagination_meta(orders)
        }
      end

      # POST /api/v1/orders
      def create
        items = Array(order_params[:items]).map(&:to_unsafe_h).map(&:symbolize_keys)

        if items.empty?
          return render json: { errors: ["items não pode estar vazio"] },
                        status: :unprocessable_entity
        end

        order = OrderBuilderService.build(
          member_id: current_member.id,
          items:     items,
          notes:     order_params[:notes]
        )

        render json: { order: order_full_json(order) }, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { errors: e.record.errors.full_messages },
               status: :unprocessable_entity
      end

      private

      def order_params
        params.require(:order).permit(
          :notes,
          items: %i[product_id product_name product_sku color size qty unit_price]
        )
      end

      def order_summary_json(o)
        {
          id:          o.id,
          status:      o.status,
          total_units: o.total_units,
          total_value: o.total_value,
          notes:       o.notes,
          created_at:  o.created_at
        }
      end

      def order_full_json(o)
        order_summary_json(o).merge(
          items: o.order_items.map { |i| item_json(i) }
        )
      end

      def item_json(i)
        {
          id:           i.id,
          product_id:   i.product_id,
          product_name: i.product_name,
          product_sku:  i.product_sku,
          color:        i.color,
          size:         i.size,
          qty:          i.qty,
          unit_price:   i.unit_price,
          subtotal:     i.subtotal
        }
      end
    end
  end
end
