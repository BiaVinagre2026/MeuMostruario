# frozen_string_literal: true

module Api
  module V1
    class PaymentsController < ApplicationController
      # O gateway nao conhece o cabecalho de tenant desta aplicacao: quem diz
      # de qual tenant e a cobranca e o proprio endereco de callback, que
      # montamos por tenant ao criar cada cobranca.
      skip_before_action :require_tenant!

      # A documentacao da Orbe diz que o callback e assinado com HMAC-SHA256 mas
      # nao diz em qual cabecalho. Um palpite unico e errado recusaria 100% das
      # confirmacoes com 401 — e o sintoma seria "pedido pago que nunca consta
      # como pago". Entao procuramos a assinatura nos nomes usados no mercado.
      # Isso nao afrouxa nada: o valor ainda precisa bater com o HMAC do segredo
      # do tenant. Quando a Casetec confirmar o nome, basta gravar em
      # psp_signature_header e a busca passa a olhar so aquele.
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
        secret = @tenant.tenant_config&.psp_callback_secret_enc.presence ||
                 ENV["GATEWAY_WEBHOOK_SECRET"].presence

        return render json: { error: "webhook secret not configured" }, status: :service_unavailable if secret.blank?

        digest = OpenSSL::HMAC.digest("SHA256", secret, request.raw_post)
        # Hex e base64 sao as duas formas de escrever o mesmo HMAC, e a
        # documentacao nao diz qual a Orbe usa.
        esperados = [digest.unpack1("H*"), Base64.strict_encode64(digest)]

        return if assinaturas_recebidas.any? { |recebida|
          esperados.any? { |esperado| iguais?(esperado, recebida) }
        }

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
