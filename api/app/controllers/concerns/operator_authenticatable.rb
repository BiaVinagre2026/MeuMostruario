# frozen_string_literal: true

module OperatorAuthenticatable
  extend ActiveSupport::Concern

  included do
    before_action :require_operator_auth!
  end

  private

  def current_operator
    @current_operator
  end

  def require_operator_auth!
    token = cookies.signed[:app_operator_token]
    return render json: { error: "Unauthorized" }, status: :unauthorized unless token

    payload = JwtService.decode_operator(token)
    @current_operator = Operator.active.find_by(id: payload["operator_id"])

    unless @current_operator
      return render json: { error: "Unauthorized" }, status: :unauthorized
    end

    if @current_operator.admin? && current_tenant
      unless @current_operator.tenant_id == current_tenant.id
        return render json: { error: "Forbidden" }, status: :forbidden
      end
    end

  rescue JwtService::TokenExpiredError
    cookies.delete(:app_operator_token)
    render json: { error: "Token expired", code: "session_expired" }, status: :unauthorized
  rescue JwtService::InvalidTokenError
    cookies.delete(:app_operator_token)
    render json: { error: "Invalid token", code: "invalid_token" }, status: :unauthorized
  end

  def require_super_admin!
    render json: { error: "Forbidden" }, status: :forbidden unless current_operator&.super_admin?
  end
end
