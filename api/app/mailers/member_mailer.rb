# frozen_string_literal: true

class MemberMailer < ApplicationMailer
  def first_access(member, token, tenant_config)
    @member    = member
    @token     = token
    @reset_url = build_reset_url(tenant_config, token)
    configure_for_tenant(tenant_config)
    mail(to: member.email, from: from_for(tenant_config), subject: "Set your password")
  end

  def password_changed(member, tenant_config)
    @member = member
    configure_for_tenant(tenant_config)
    mail(to: member.email, from: from_for(tenant_config), subject: "Your password was changed")
  end

  private

  def frontend_url(tenant_config)
    tenant = tenant_config.tenant
    app_domain = ENV.fetch("APP_DOMAIN", "app.local")

    if Rails.env.production?
      tenant.custom_domain.presence ? "https://#{tenant.custom_domain}" : "https://#{tenant.slug}.#{app_domain}"
    else
      "http://#{tenant.slug}.#{app_domain}:8080"
    end
  end

  def build_reset_url(tenant_config, token)
    "#{frontend_url(tenant_config)}/set-password?token=#{token}"
  end
end
