# frozen_string_literal: true

module HasAddress
  extend ActiveSupport::Concern

  REQUIRED_ADDRESS_FIELDS = %w[street street_number neighborhood city state zip_code].freeze

  BRAZILIAN_STATES = %w[
    AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO
  ].freeze

  def valid_address?(addr = nil)
    addr ||= respond_to?(:billing_address) ? billing_address : address
    return false unless addr.is_a?(Hash)

    REQUIRED_ADDRESS_FIELDS.all? { |f| addr[f].present? || addr[f.to_sym].present? }
  end

  def normalize_address(addr)
    return {} unless addr.is_a?(Hash)

    normalized = addr.transform_keys(&:to_s).each_with_object({}) do |(k, v), h|
      h[k] = v.is_a?(String) ? v.strip : v
    end

    normalized["zip_code"] = normalized["zip_code"].to_s.gsub(/\D/, "") if normalized["zip_code"]
    normalized["state"] = normalized["state"].to_s.strip.upcase if normalized["state"]

    normalized
  end
end
