# frozen_string_literal: true

class TenantConfig < ApplicationRecord
  belongs_to :tenant

  PAYMENT_METHODS = %w[pix boleto credit_card credit_card_3ds credit_card_installments debit_card].freeze

  MULTIPLIER_RULES_DEFAULTS = {
    "monthly_payment"  => true,
    "complete_profile" => true,
    "coin_purchase"    => false,
    "mission"          => false,
    "referral"         => true,
    "admin_credit"     => false,
    "birthday"         => true
  }.freeze

  validates :coin_name, presence: true
  validates :color_primary, :color_secondary, :color_accent, presence: true
  validates :overdue_days, numericality: { greater_than_or_equal_to: 0 }
  validates :refund_deadline_days, numericality: { greater_than_or_equal_to: 0 }
  validates :coin_expiry_policy, inclusion: { in: %w[never days fixed_date] }
  validates :coin_brl_rate, numericality: { greater_than: 0 }, allow_nil: true
  validates :psp_api_url, format: { with: /\Ahttps?:\/\// }, allow_blank: true
  validate :validate_coin_packages
  validate :validate_enabled_payment_methods

  def money_payment_enabled?
    allow_money_payment == true
  end

  def payment_method_enabled?(method)
    (enabled_payment_methods.presence || %w[pix boleto credit_card]).include?(method.to_s)
  end

  def coin_packages_list
    (coin_packages || []).map(&:symbolize_keys)
  end

  def coin_events_config
    coin_events || {}
  end

  def multiplier_rules_config
    MULTIPLIER_RULES_DEFAULTS.merge(multiplier_rules || {})
  end

  def multiplier_for?(event_key)
    multiplier_rules_config[event_key.to_s] != false
  end

  def coins_to_brl(coins)
    (coins.to_d * coin_brl_rate.to_d).round(2)
  end

  def brl_to_coins(brl)
    return 0 if coin_brl_rate.to_d.zero?
    (brl.to_d / coin_brl_rate.to_d).round(0)
  end

  def format_brl(value)
    format("R$ %.2f", value).tr(".", ",")
  end

  def event_coins(event_type)
    coin_events_config.dig(event_type.to_s, "coins") || 0
  end

  def event_xp(event_type)
    coin_events_config.dig(event_type.to_s, "xp") || 0
  end

  def email_configured?
    case email_provider
    when "letter_opener" then true
    when "ses"           then ses_access_key_id.present? && ses_secret_key_enc.present?
    when "smtp", "gmail" then smtp_host.present? && smtp_username.present?
    else false
    end
  end

  def from_address
    name  = smtp_from_name.presence || company_name.presence || "Notifications"
    email = smtp_from_email.presence || company_email.presence || "noreply@example.com"
    "#{name} <#{email}>"
  end

  def psp_configured?
    psp_api_key_enc.present? && psp_api_url.present?
  end

  def s3_configured?
    storage_provider == "s3" &&
      s3_bucket.present? &&
      s3_access_key_id.present? &&
      s3_secret_access_key_enc.present?
  end

  def s3_base_url
    s3_public_url.presence || "https://#{s3_bucket}.s3.#{s3_region.presence || 'us-east-1'}.amazonaws.com"
  end

  private

  def validate_enabled_payment_methods
    return if enabled_payment_methods.blank?
    unless enabled_payment_methods.is_a?(Array)
      errors.add(:enabled_payment_methods, "must be an array")
      return
    end
    invalid = enabled_payment_methods - PAYMENT_METHODS
    if invalid.any?
      errors.add(:enabled_payment_methods, "invalid methods: #{invalid.join(', ')}")
    end
  end

  def validate_coin_packages
    return if coin_packages.blank?
    unless coin_packages.is_a?(Array)
      errors.add(:coin_packages, "must be an array")
      return
    end
    coin_packages.each_with_index do |pkg, i|
      unless pkg["coins"].to_i > 0 && pkg["brl_cents"].to_i > 0
        errors.add(:coin_packages, "package #{i + 1}: coins and brl_cents must be positive")
      end
    end
  end
end
