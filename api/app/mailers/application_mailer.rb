# frozen_string_literal: true

class ApplicationMailer < ActionMailer::Base
  layout "branded_mailer"

  protected

  def configure_for_tenant(tenant_config)
    @tenant_config = tenant_config
    settings = EmailConfigService.delivery_settings(tenant_config)
    @_delivery_method  = settings[:delivery_method]
    @_smtp_settings    = settings[:smtp_settings]
  end

  def from_for(tenant_config)
    tenant_config&.from_address || "Notifications <noreply@example.com>"
  end

  private

  def mail(headers = {}, &block)
    if @_delivery_method
      delivery_headers = { delivery_method: @_delivery_method }
      delivery_headers[:delivery_method_options] = @_smtp_settings if @_smtp_settings.present?
      headers = delivery_headers.merge(headers)
    end
    super(headers, &block)
  end
end
