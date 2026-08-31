# frozen_string_literal: true

module Api
  module V1
    class MareCoralOrdersController < ApplicationController
      before_action :require_mare_coral_tenant!
      before_action :set_catalog_link

      def shipping_quote
        ensure_authorized_storefront!
        lines = MareCoralCartService.new(catalog_link: @catalog_link, items: order_payload[:items]).resolve!
        subtotal = lines.sum(&:subtotal)
        quote = MareCoralShippingQuoteService.new(catalog_link: @catalog_link).quote(
          postal_code: params[:postal_code], subtotal: subtotal
        )
        render json: { quote: quote.as_json.merge(subtotal: subtotal) }
      rescue MareCoralCartService::ValidationError, MareCoralShippingQuoteService::ValidationError => e
        render json: { errors: [e.message] }, status: :unprocessable_entity
      end

      def create
        result = MareCoralOrderService.new(
          tenant: current_tenant,
          catalog_link: @catalog_link,
          config: current_tenant.tenant_config
        ).create!(
          buyer: buyer_params.to_h,
          shipping_address: shipping_address_params.to_h,
          items: order_payload[:items],
          notes: order_payload[:notes],
          payment_method: order_payload[:payment_method].presence || "pix"
        )

        render json: {
          order: order_json(result.order),
          payment: result.payment && payment_json(result.payment)
        }, status: :created
      rescue MareCoralOrderService::ValidationError => e
        render json: { errors: [e.message] }, status: :unprocessable_entity
      end

      private

      def require_mare_coral_tenant!
        render json: { error: "not found" }, status: :not_found unless current_tenant&.slug == "mare-coral"
      end

      def set_catalog_link
        @catalog_link = CatalogLink.active.includes(catalog: { catalog_items: { product: [:variants, :images] } }).find_by!(token: params[:token])
      end

      def ensure_authorized_storefront!
        settings = @catalog_link.metadata.to_h["retail_storefront"]
        unless @catalog_link.allow_order? && settings.is_a?(Hash) && settings["enabled"] == true
          raise MareCoralCartService::ValidationError, "vitrine varejista nao autorizada"
        end
      end

      def order_payload
        params.require(:order)
      end

      def buyer_params
        order_payload.permit(:buyer_name, :buyer_email, :buyer_phone, :buyer_document).transform_keys do |key|
          key.to_s.sub("buyer_", "")
        end
      end

      def shipping_address_params
        order_payload.require(:shipping_address).permit(
          :postal_code, :street, :number, :complement, :neighborhood, :city, :state
        )
      end

      def order_json(order)
        shipping = order.metadata.to_h.fetch("shipping", {})
        {
          id: order.id,
          status: order.status,
          payment_status: order.payment_status,
          total_units: order.total_units,
          items_subtotal: order.metadata.to_h["items_subtotal"],
          shipping_amount: shipping["amount"],
          shipping_method: shipping["method"],
          shipping_estimated_days: shipping["estimated_days"],
          total_value: order.total_value,
          inventory_state: order.metadata.to_h.dig("inventory", "state")
        }
      end

      def payment_json(payment)
        {
          id: payment.id,
          status: payment.status,
          payment_method: payment.payment_method,
          amount: payment.amount,
          checkout_url: payment.checkout_url,
          pix_qr_code: payment.pix_qr_code,
          pix_expiration: payment.raw_response["pix_expiration"],
          error_message: payment.status == "failed" ? payment.raw_response["message"] : nil
        }
      end
    end
  end
end
