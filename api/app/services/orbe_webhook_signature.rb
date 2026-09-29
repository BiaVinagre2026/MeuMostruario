# frozen_string_literal: true

require "openssl"
require "active_support/security_utils"

# Contrato Orbe PSP 1.1.0: X-PSP-Signature: t=<unix>,v1=<hex>[,v1=<hex>].
# O corpo deve permanecer exatamente como recebido, sem reserializar o JSON.
class OrbeWebhookSignature
  HEADER_NAME = "X-PSP-Signature"
  TOLERANCE_SECONDS = 300

  def self.valid?(header:, secret:, body:, now: Time.now)
    return false if secret.to_s.empty? || header.to_s.empty?

    fields = header.to_s.split(",").map { |field| field.strip.split("=", 2) }
    timestamps = fields.select { |key, _| key == "t" }.map(&:last)
    return false unless timestamps.one? && timestamps.first.to_s.match?(/\A\d{1,12}\z/)

    timestamp = timestamps.first
    return false if (now.to_i - timestamp.to_i).abs > TOLERANCE_SECONDS

    signatures = fields.select { |key, _| key == "v1" }.map(&:last)
    expected = OpenSSL::HMAC.hexdigest("SHA256", secret, "#{timestamp}.#{body}")

    signatures.any? do |signature|
      signature.to_s.match?(/\A[0-9a-f]{64}\z/i) &&
        ActiveSupport::SecurityUtils.secure_compare(expected, signature.downcase)
    end
  end
end
