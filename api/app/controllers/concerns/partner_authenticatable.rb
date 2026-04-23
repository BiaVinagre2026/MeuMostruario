# frozen_string_literal: true

module PartnerAuthenticatable
  extend ActiveSupport::Concern

  included do
    before_action :require_partner_auth!
  end

  private

  def current_partner
    @current_partner
  end

  def require_partner_auth!
    token = cookies.signed[:app_partner_token]
    return render_unauthorized unless token

    begin
      @current_partner = PartnerAuthService.current_partner(token)
    rescue PartnerAuthService::TokenExpiredError
      cookies.delete(:app_partner_token)
      return render json: { error: "Token expired", code: "session_expired" }, status: :unauthorized
    rescue PartnerAuthService::InvalidTokenError
      cookies.delete(:app_partner_token)
      return render json: { error: "Invalid token", code: "invalid_token" }, status: :unauthorized
    end

    render_unauthorized unless @current_partner
  end

  def require_tenant_authorization!(tenant)
    authorization = TenantPartnerAuthorization.find_by(
      partner_id: current_partner.id,
      tenant_id: tenant.id,
      status: "active"
    )
    unless authorization
      render json: { error: "Partner not authorized for this tenant" }, status: :forbidden
    end
  end

  def require_partner_api_key!
    api_key = request.headers["X-Partner-API-Key"]
    return render_unauthorized unless api_key

    @current_partner = PartnerAuthService.authenticate_api_key(api_key)
    render_unauthorized unless @current_partner
  end

  def render_unauthorized
    render json: { error: "Unauthorized" }, status: :unauthorized
  end
end
