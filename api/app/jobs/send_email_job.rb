# frozen_string_literal: true

class SendEmailJob < ApplicationJob
  queue_as :emails

  # Enqueues an email to be sent via a tenant-configured mailer.
  #
  # Args convention (all IDs, not AR objects):
  #   MemberMailer#first_access(member_id, token)
  #   MemberMailer#password_changed(member_id)
  def perform(tenant_slug, mailer_class, method_name, *serialized_args)
    tenant = Tenant.find_by!(slug: tenant_slug)
    TenantSwitcher.switch(tenant) do
      tenant_config = tenant.tenant_config
      klass = mailer_class.constantize
      args = resolve_args(klass, method_name, serialized_args, tenant_config)
      klass.public_send(method_name, *args).deliver_now
    end
  rescue => e
    Rails.logger.error "[SendEmailJob] Failed #{mailer_class}##{method_name} (tenant=#{tenant_slug}, args=#{serialized_args.inspect}): #{e.message}"
    raise
  end

  private

  def resolve_args(klass, method_name, serialized_args, tenant_config)
    case "#{klass}##{method_name}"
    when "MemberMailer#first_access"
      member_id, token = serialized_args
      [ Member.find(member_id), token, tenant_config ]
    when "MemberMailer#password_changed"
      [ Member.find(serialized_args[0]), tenant_config ]
    else
      serialized_args + [ tenant_config ]
    end
  end
end
