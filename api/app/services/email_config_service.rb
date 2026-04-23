# frozen_string_literal: true

# EmailConfigService
#
# Returns ActionMailer-compatible delivery settings for a given TenantConfig.
#
# Resolution order:
#   1. Provider == "letter_opener" → letter_opener_web (dev/test only)
#   2. Tenant has a real provider configured → use it
#   3. Not configured (non-production) → letter_opener_web as safe fallback
#   4. Not configured (production) → raise EmailNotConfiguredError
class EmailConfigService
  class EmailNotConfiguredError < StandardError; end

  def self.delivery_settings(tenant_config)
    provider = tenant_config&.email_provider

    if provider == "letter_opener"
      if Rails.env.production?
        tenant_slug = tenant_config&.tenant&.slug || "unknown"
        raise EmailNotConfiguredError,
              "Email not configured for tenant '#{tenant_slug}'. " \
              "Configure SMTP, Gmail or SES in the admin settings " \
              "(letter_opener mode is for development only)."
      else
        return letter_opener_settings
      end
    end

    unless tenant_config&.email_configured?
      if Rails.env.production?
        tenant_slug = tenant_config&.tenant&.slug || "unknown"
        raise EmailNotConfiguredError,
              "Email not configured for tenant '#{tenant_slug}'. " \
              "Configure SMTP, Gmail or SES in the admin settings."
      else
        return letter_opener_settings
      end
    end

    case provider
    when "ses"   then ses_smtp_settings(tenant_config)
    when "gmail" then gmail_settings(tenant_config)
    else              smtp_settings(tenant_config)
    end
  end

  def self.letter_opener_settings
    { delivery_method: :letter_opener_web }
  end

  def self.smtp_settings(tc)
    {
      delivery_method: :smtp,
      smtp_settings: {
        address:              tc.smtp_host,
        port:                 tc.smtp_port || 587,
        user_name:            tc.smtp_username,
        password:             tc.smtp_password_enc,
        authentication:       (tc.smtp_authentication || "plain").to_sym,
        enable_starttls_auto: tc.smtp_enable_starttls != false
      }
    }
  end

  def self.gmail_settings(tc)
    settings = smtp_settings(tc)
    settings[:smtp_settings][:address] = "smtp.gmail.com"
    settings[:smtp_settings][:port]    = 587
    settings
  end

  def self.ses_smtp_settings(tc)
    region = tc.ses_region.presence || "us-east-1"
    {
      delivery_method: :smtp,
      smtp_settings: {
        address:              "email-smtp.#{region}.amazonaws.com",
        port:                 587,
        user_name:            tc.ses_access_key_id,
        password:             tc.ses_secret_key_enc,
        authentication:       :login,
        enable_starttls_auto: true
      }
    }
  end

  private_class_method :letter_opener_settings, :smtp_settings, :gmail_settings, :ses_smtp_settings
end
