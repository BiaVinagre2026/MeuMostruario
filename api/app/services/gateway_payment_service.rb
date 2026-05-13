# frozen_string_literal: true

class GatewayPaymentService
  def initialize(config: nil)
    @config = config
  end

  def create_intent!(order:, payment_method: "pix")
    payment = order.payments.create!(
      amount: order.total_value,
      payment_method: payment_method,
      status: "pending",
      gateway_reference: "local-#{SecureRandom.hex(12)}",
      raw_response: {
        "mode" => configured? ? "gateway_pending_integration" : "local_placeholder",
        "message" => "Gateway proprio pendente de mapeamento de API"
      }
    )

    order.update!(payment_status: "pending")
    payment
  end

  def apply_webhook!(payload)
    reference = payload["gateway_reference"] || payload["id"] || payload["reference"]
    payment = Payment.find_by!(gateway_reference: reference)
    status = normalize_status(payload["status"])

    payment.update!(
      status: status,
      webhook_payload: payload,
      paid_at: status == "paid" ? Time.current : payment.paid_at
    )
    payment.order.update!(payment_status: order_payment_status(status))
    payment
  end

  private

  def configured?
    @config&.respond_to?(:psp_configured?) && @config.psp_configured?
  end

  def normalize_status(status)
    case status.to_s
    when "paid", "approved", "confirmed" then "paid"
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
