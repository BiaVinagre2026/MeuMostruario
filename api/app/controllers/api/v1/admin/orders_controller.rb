# frozen_string_literal: true

module Api
  module V1
    module Admin
      class OrdersController < BaseController

        # GET /api/v1/admin/orders
        def index
          scope = Order.includes(:member, :order_items)

          scope = scope.where(status: params[:status]) if params[:status].present?
          scope = scope.where(member_id: params[:member_id]) if params[:member_id].present?

          if params[:q].present?
            q = "%#{ActiveRecord::Base.sanitize_sql_like(params[:q].strip)}%"
            scope = scope.joins(:order_items)
                         .where("order_items.product_name ILIKE :q", q: q)
                         .distinct
          end

          orders = paginate(scope)
          render json: {
            orders: orders.map { |o| order_summary_json(o) },
            meta:   pagination_meta(orders)
          }
        end

        # GET /api/v1/admin/orders/:id
        def show
          order = Order.includes(:member, :order_items).find(params[:id])
          render json: { order: order_full_json(order) }
        end

        # PATCH /api/v1/admin/orders/:id
        def update
          order = Order.find(params[:id])
          new_status = order_params[:status]

          unless Order::STATUS_VALUES.include?(new_status)
            return render json: { errors: ["status '#{new_status}' inválido"] },
                          status: :unprocessable_entity
          end

          Order.transaction do
            if new_status == "cancelled"
              MareCoralInventoryService.release!(order)
            elsif new_status.in?(%w[confirmed processing shipped])
              MareCoralInventoryService.commit!(order)
            end
            order.update!(status: new_status)
          end

          render json: { order: order_full_json(order.reload) }
        rescue ActiveRecord::RecordInvalid, MareCoralInventoryService::StockError => e
          render json: { errors: [e.message] }, status: :unprocessable_entity
        end

        private

        def order_params
          params.require(:order).permit(:status)
        end

        def member_json(m)
          return nil unless m
          { id: m.id, full_name: m.full_name, email: m.email, phone: m.phone }
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
            subtotal:     i.subtotal,
            metadata:     i.metadata
          }
        end

        def order_summary_json(o)
          metadata = o.metadata.to_h
          {
            id:          o.id,
            status:      o.status,
            payment_status: o.payment_status,
            total_units: o.total_units,
            total_value: o.total_value,
            notes:       o.notes,
            member:      member_json(o.member),
            buyer:       {
              name: o.buyer_name,
              phone: o.buyer_phone,
              email: o.buyer_email
            },
            catalog_link_id: o.catalog_link_id,
            metadata:    metadata,
            items_subtotal: metadata["items_subtotal"],
            shipping: metadata["shipping"],
            shipping_address: metadata["shipping_address"],
            inventory_state: metadata.dig("inventory", "state"),
            created_at:  o.created_at,
            updated_at:  o.updated_at
          }
        end

        def order_full_json(o)
          order_summary_json(o).merge(
            items: o.order_items.map { |i| item_json(i) }
          )
        end
      end
    end
  end
end
