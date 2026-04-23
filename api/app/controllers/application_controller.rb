class ApplicationController < ActionController::API
  include ActionController::Cookies

  before_action :require_tenant!

  rescue_from StandardError, with: :handle_standard_error
  rescue_from ActiveRecord::RecordNotFound, with: :handle_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :handle_unprocessable_entity

  private

  def current_tenant
    @current_tenant ||= request.env["app.tenant"]
  end

  def require_tenant!
    render json: { error: "Tenant not found" }, status: :not_found unless current_tenant
  end

  def current_member
    @current_member
  end

  def require_auth!
    token = cookies.signed[:app_token] || extract_bearer_token
    return render json: { error: "Unauthorized" }, status: :unauthorized unless token

    payload = JwtService.decode(token)
    return render json: { error: "Unauthorized" }, status: :unauthorized unless payload

    @current_member = Member.includes(:level).find_by(id: payload["member_id"])
    render json: { error: "Unauthorized" }, status: :unauthorized unless @current_member
  rescue JwtService::TokenExpiredError
    cookies.delete(:app_token)
    render json: { error: "Token expired", code: "session_expired" }, status: :unauthorized
  rescue JwtService::InvalidTokenError
    cookies.delete(:app_token)
    render json: { error: "Invalid token", code: "invalid_token" }, status: :unauthorized
  end

  def extract_bearer_token
    header = request.headers["Authorization"]
    header&.match(/\ABearer (.+)\z/)&.captures&.first
  end

  def mobile_client?
    request.headers["X-Client-Type"] == "mobile"
  end

  def handle_standard_error(e)
    Rails.logger.error("#{e.class}: #{e.message}\n#{e.backtrace.first(5).join("\n")}")
    render json: { error: "Internal server error" }, status: :internal_server_error
  end

  def handle_not_found(e)
    render json: { error: e.message }, status: :not_found
  end

  def handle_unprocessable_entity(e)
    render json: { error: e.record.errors.full_messages }, status: :unprocessable_entity
  end

  def paginate(scope)
    page     = (params[:page] || 1).to_i
    per_page = params[:per_page].present? ? [[params[:per_page].to_i, 1].max, 100].min : 20
    scope.page(page).per(per_page)
  end

  def pagination_meta(scope)
    {
      current_page: scope.current_page,
      total_pages: scope.total_pages,
      total_count: scope.total_count,
      per_page: scope.limit_value
    }
  end
end
