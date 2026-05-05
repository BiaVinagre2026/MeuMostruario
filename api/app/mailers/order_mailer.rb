# frozen_string_literal: true

class OrderMailer < ApplicationMailer
  def admin_notification(order, tenant_config)
    @order         = order
    @items         = order.order_items.order(:id).to_a
    @meta          = order.metadata || {}
    @tenant_config = tenant_config

    configure_for_tenant(tenant_config)

    mail(
      to:      tenant_config.company_email.presence || "admin@example.com",
      from:    from_for(tenant_config),
      subject: "Novo pedido ##{order.id} · #{@items.sum(&:qty)} peças"
    )
  end
end
