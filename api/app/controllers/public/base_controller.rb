# frozen_string_literal: true

module Public
  class BaseController < ActionController::Base
    protect_from_forgery with: :exception
    layout "storefront"
    helper StorefrontHelper
    helper_method :current_tenant, :tenant_config, :current_member, :member_logged_in?

    before_action :resolve_tenant!

    private

    def resolve_tenant!
      @tenant = request.env["app.tenant"]
      unless @tenant
        render plain: "Tenant não encontrado", status: :not_found
        return
      end
      @tenant_config = TenantConfig.find_by(tenant: @tenant)
    end

    def current_tenant = @tenant
    def tenant_config   = @tenant_config

    def current_member
      return @current_member if defined?(@current_member)
      @current_member = nil
      if session[:member_id].present?
        mid = session[:member_id].to_i
        row = ActiveRecord::Base.connection.execute(
          "SELECT id, full_name, email FROM members WHERE id = #{mid} AND status = 'active' LIMIT 1"
        ).first
        @current_member = row
      end
      @current_member
    end

    def member_logged_in?
      current_member.present?
    end

    def require_member_login!
      return if member_logged_in?
      session[:return_to] = request.fullpath
      redirect_to entrar_path, alert: "Faça login para continuar."
    end
  end
end
