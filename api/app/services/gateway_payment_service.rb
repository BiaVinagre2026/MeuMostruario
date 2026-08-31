# frozen_string_literal: true

require "net/http"
require "json"

# Integracao com a Orbe PSP (https://psp.casetec.com.br/api-docs).
#
# Cada tenant e um merchant proprio no gateway: a chave de API, o identificador
# do merchant e o segredo do callback vivem em TenantConfig, nao em variavel de
# ambiente. Sem credencial configurada o servico continua registrando o
# pagamento localmente, para que o fluxo de pedido funcione em desenvolvimento.
class GatewayPaymentService
  DEFAULT_API_URL = "https://api.casetec.com.br"
  PIX_PATH = "/psp/v1/pix"
  OPEN_TIMEOUT = 10
  READ_TIMEOUT = 30

  class GatewayError < StandardError; end

  def initialize(config: nil)
    @config = config
  end

  def create_intent!(order:, payment_method: "pix")
    # A Idempotency-Key nasce junto do pagamento e fica gravada: se a chamada
    # cair no meio e alguem repetir, o gateway reconhece a mesma operacao em vez
    # de abrir uma segunda cobranca para o mesmo pedido.
    payment = order.payments.create!(
      amount: order.total_value,
      payment_method: payment_method,
      status: "pending",
      idempotency_key: SecureRandom.uuid
    )
    order.update!(payment_status: "pending")

    return record_local_mode!(payment) unless integrate?(payment_method)

    begin
      charge = create_pix_charge!(order: order, payment: payment)
      apply_charge!(payment, charge)
    rescue GatewayError => e
      # O pedido ja existe e vale mais que a cobranca: em vez de derrubar a
      # requisicao, o pagamento fica marcado como falho e pode ser refeito.
      payment.update!(
        status: "failed",
        raw_response: { "mode" => "gateway_error", "message" => e.message }
      )
      order.update!(payment_status: "failed")
      payment
    end
  end

  def apply_webhook!(payload)
    data = payload["data"].is_a?(Hash) ? payload["data"] : payload
    reference = data["id"] || data["charge_id"] || payload["gateway_reference"] || payload["reference"]
    payment = Payment.find_by!(gateway_reference: reference.to_s)
    status = normalize_status(data["status"] || payload["status"])

    Payment.transaction do
      if status == "paid"
        MareCoralInventoryService.commit!(payment.order)
      elsif status == "cancelled"
        MareCoralInventoryService.release!(payment.order)
      end

      payment.update!(
        status: status,
        webhook_payload: payload,
        paid_at: status == "paid" ? (payment.paid_at || Time.current) : payment.paid_at
      )
      payment.order.update!(payment_status: order_payment_status(status))
    end
    payment
  end

  private

  def integrate?(payment_method)
    configured? && payment_method.to_s == "pix"
  end

  def configured?
    @config.respond_to?(:psp_configured?) && @config.psp_configured?
  end

  def record_local_mode!(payment)
    payment.update!(
      gateway_reference: "local-#{SecureRandom.hex(12)}",
      raw_response: {
        "mode" => configured? ? "unsupported_method" : "local_placeholder",
        "message" => configured? ? "metodo ainda nao integrado ao gateway" : "gateway nao configurado neste tenant"
      }
    )
    payment
  end

  def create_pix_charge!(order:, payment:)
    body = {
      amount_cents: (order.total_value.to_d * 100).round,
      currency: "BRL",
      description: "Pedido ##{order.id}",
      customer_name: order.buyer_name,
      customer_document: DocumentValidator.clean(order.buyer_document),
      customer_email: order.buyer_email.presence,
      client_reference: client_reference(order),
      callback_url: callback_url
    }.compact

    response = post_json(PIX_PATH, body, idempotency_key: payment.idempotency_key)
    raise GatewayError, "resposta sem id da cobranca" if response["id"].blank?

    response
  end

  def apply_charge!(payment, charge)
    payment.update!(
      gateway_reference: charge["id"].to_s,
      status: normalize_status(charge["status"]),
      pix_qr_code: charge["pix_qr_code"],
      checkout_url: charge["pix_qr_code_url"],
      raw_response: charge
    )
    payment.order.update!(payment_status: order_payment_status(payment.status))
    payment
  end

  # O identificador do pedido se repete entre tenants porque cada schema tem a
  # propria sequencia; o slug na frente evita confusao ao investigar no gateway.
  def client_reference(order)
    [@config&.tenant&.slug, order.id].compact.join("-")
  end

  def callback_url
    base = ENV["PSP_CALLBACK_BASE_URL"].presence || ENV.fetch("APP_URL", "http://localhost:3000")
    "#{base.chomp('/')}/api/v1/payments/webhook/#{@config&.tenant&.slug}"
  end

  def post_json(path, body, idempotency_key:)
    uri = URI.join(api_url, path)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"
    http.open_timeout = OPEN_TIMEOUT
    http.read_timeout = READ_TIMEOUT

    request = Net::HTTP::Post.new(uri)
    request["Content-Type"] = "application/json"
    request["Accept"] = "application/json"
    request["Authorization"] = "Bearer #{@config.psp_api_key_enc}"
    request["Idempotency-Key"] = idempotency_key
    request.body = body.to_json

    response = http.request(request)
    parsed = parse_body(response.body)

    unless response.is_a?(Net::HTTPSuccess)
      raise GatewayError, "gateway respondeu #{response.code}: #{parsed['error'] || parsed['message'] || response.body.to_s[0, 200]}"
    end

    parsed
  rescue Net::OpenTimeout, Net::ReadTimeout => e
    raise GatewayError, "tempo esgotado ao falar com o gateway (#{e.class})"
  rescue SocketError, Errno::ECONNREFUSED => e
    raise GatewayError, "nao foi possivel alcancar o gateway: #{e.message}"
  end

  def api_url
    @config&.psp_api_url.presence || DEFAULT_API_URL
  end

  def parse_body(raw)
    JSON.parse(raw.to_s)
  rescue JSON::ParserError
    {}
  end

  # Status da Orbe: pending, processing, authorized, captured, paid, failed,
  # cancelled, expired. `captured` significa dinheiro capturado e precisa contar
  # como pago — antes caia no ramo generico e virava pendente.
  def normalize_status(status)
    case status.to_s
    when "paid", "captured", "approved", "confirmed" then "paid"
    when "failed", "rejected", "denied" then "failed"
    when "cancelled", "canceled" then "cancelled"
    when "expired" then "expired"
    else "pending"
    end
  end

  def order_payment_status(status)
    return "paid" if status == "paid"
    return "failed" if status.in?(%w[failed expired])
    return "cancelled" if status == "cancelled"
    "pending"
  end
end
