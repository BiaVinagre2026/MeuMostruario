# frozen_string_literal: true

module Api
  module V1
    class PaymentsController < ApplicationController
      # O gateway nao conhece o cabecalho de tenant desta aplicacao: quem diz
      # de qual tenant e a cobranca e o proprio endereco de callback, que
      # montamos por tenant ao criar cada cobranca.
      skip_before_action :require_tenant!

      before_action :load_tenant!
      before_action :verify_gateway_signature!

      def webhook
        payment = TenantSwitcher.switch(@tenant) do
          GatewayPaymentService.new(config: @tenant.tenant_config).apply_webhook!(webhook_payload)
        end

        render json: { payment: { id: payment.id, status: payment.status } }
      rescue ActiveRecord::RecordNotFound
        render json: { error: "payment not found" }, status: :not_found
      end

      private

      def load_tenant!
        @tenant = Tenant.find_by(slug: params[:tenant_slug])
        render json: { error: "tenant not found" }, status: :not_found if @tenant.nil?
      end

      def verify_gateway_signature!
        secret = @tenant.tenant_config&.psp_callback_secret_enc.presence ||
                 ENV["GATEWAY_WEBHOOK_SECRET"].presence

        return render json: { error: "webhook secret not configured" }, status: :service_unavailable if secret.blank?

        expected = OpenSSL::HMAC.hexdigest("SHA256", secret, request.raw_post)
        provided = request.headers[signature_header].to_s

        unless provided.bytesize == expected.bytesize && ActiveSupport::SecurityUtils.secure_compare(expected, provided)
          render json: { error: "invalid signature" }, status: :unauthorized
        end
      end

      # O nome do cabecalho e configuravel porque a documentacao do PSP nao o
      # especifica; o padrao cobre a integracao antiga.
      def signature_header
        @tenant.tenant_config&.psp_signature_header.presence || "X-Gateway-Signature"
      end

      def webhook_payload
        JSON.parse(request.raw_post)
      rescue JSON::ParserError
        {}
      end
    end
  end
end
