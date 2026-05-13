# frozen_string_literal: true

module Api
  module V1
    class PaymentsController < ApplicationController
      before_action :verify_gateway_signature!

      def webhook
        payment = GatewayPaymentService.new.apply_webhook!(webhook_payload)
        render json: { payment: { id: payment.id, status: payment.status } }
      rescue ActiveRecord::RecordNotFound
        render json: { error: "payment not found" }, status: :not_found
      end

      private

      def verify_gateway_signature!
        secret = ENV["GATEWAY_WEBHOOK_SECRET"]
        return render json: { error: "webhook secret not configured" }, status: :service_unavailable if secret.blank?

        expected = OpenSSL::HMAC.hexdigest("SHA256", secret, request.raw_post)
        provided = request.headers["X-Gateway-Signature"].to_s

        unless provided.bytesize == expected.bytesize && ActiveSupport::SecurityUtils.secure_compare(expected, provided)
          render json: { error: "invalid signature" }, status: :unauthorized
        end
      end

      def webhook_payload
        JSON.parse(request.raw_post)
      rescue JSON::ParserError
        {}
      end
    end
  end
end
