# frozen_string_literal: true

module Api
  module V1
    class PaymentsController < ApplicationController
      # O gateway nao conhece o cabecalho de tenant desta aplicacao: quem diz
      # de qual tenant e a cobranca e o proprio endereco de callback, que
      # montamos por tenant ao criar cada cobranca.
      skip_before_action :require_tenant!

      # Compatibilidade dos tenants existentes. O contrato atual da Orbe usa
      # timestamp + corpo e e ativado explicitamente por tenant ao configurar
      # X-PSP-Signature; nao alterar implicitamente a operacao dos demais.
      CANDIDATE_SIGNATURE_HEADERS = [
        "X-Gateway-Signature",
        "X-Orbe-Signature",
        "X-Casetec-Signature",
        "X-Webhook-Signature",
        "X-Signature",
        "X-Hub-Signature-256",
        "Signature"
      ].freeze

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
        if @tenant.tenant_config&.psp_signature_header.to_s.casecmp?(OrbeWebhookSignature::HEADER_NAME)
          return verify_orbe_signature!
        end

        secret = @tenant.tenant_config&.psp_callback_secret_enc.presence ||
                 ENV["GATEWAY_WEBHOOK_SECRET"].presence

        return render json: { error: "webhook secret not configured" }, status: :service_unavailable if secret.blank?

        digest = OpenSSL::HMAC.digest("SHA256", secret, request.raw_post)
        # Formatos legados preservados para os tenants que ainda os utilizam.
        # A Orbe atual e verificada separadamente com timestamp e hexadecimal.
        esperados = [digest.unpack1("H*"), Base64.strict_encode64(digest)]

        return if assinaturas_recebidas.any? { |recebida|
          esperados.any? { |esperado| iguais?(esperado, recebida) }
        }

        render json: { error: "invalid signature" }, status: :unauthorized
      end

      def verify_orbe_signature!
        # O segredo pertence ao endpoint deste tenant. Nao reutilizar o segredo
        # global nem aceitar o formato legado como alternativa a uma falha.
        secret = @tenant.tenant_config&.psp_callback_secret_enc.presence
        return render json: { error: "webhook secret not configured" }, status: :service_unavailable if secret.blank?

        return if OrbeWebhookSignature.valid?(
          header: request.headers[OrbeWebhookSignature::HEADER_NAME],
          secret: secret,
          body: request.raw_post
        )

        render json: { error: "invalid signature" }, status: :unauthorized
      end

      # Assinaturas presentes na requisicao, ja sem o prefixo `sha256=` que
      # alguns gateways colocam na frente do valor.
      def assinaturas_recebidas
        nomes = @tenant.tenant_config&.psp_signature_header.presence
        nomes = nomes ? [nomes] : CANDIDATE_SIGNATURE_HEADERS

        nomes.filter_map { |nome| request.headers[nome].presence }
             .map { |valor| valor.to_s.strip.sub(/\Asha256=/i, "") }
      end

      # Comparacao de tempo constante. O secure_compare estoura se os tamanhos
      # diferirem, e aqui eles diferem o tempo todo: hex tem 64 caracteres,
      # base64 tem 44.
      def iguais?(esperado, recebida)
        esperado.bytesize == recebida.bytesize &&
          ActiveSupport::SecurityUtils.secure_compare(esperado, recebida)
      end

      def webhook_payload
        JSON.parse(request.raw_post)
      rescue JSON::ParserError
        {}
      end
    end
  end
end
