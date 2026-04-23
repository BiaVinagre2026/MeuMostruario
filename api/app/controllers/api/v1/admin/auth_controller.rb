# frozen_string_literal: true

module Api
  module V1
    module Admin
      class AuthController < BaseController
        def tenant_required? = false

        # POST /api/v1/admin/auth/login
        def login
          operator = OperatorAuthService.authenticate(
            email:    params[:email],
            password: params[:password]
          )

          unless operator
            return render json: { error: "Invalid credentials" }, status: :unauthorized
          end

          if operator.admin?
            unless current_tenant && operator.tenant_id == current_tenant.id
              return render json: { error: "Invalid credentials" }, status: :unauthorized
            end
          end

          token = OperatorAuthService.token_for(operator)

          cookies.signed[:app_operator_token] = {
            value:     token,
            httponly:  true,
            same_site: :lax,
            expires:   8.hours.from_now,
            secure:    Rails.env.production?
          }

          render json: { operator: operator_json(operator) }, status: :ok
        end

        # DELETE /api/v1/admin/auth/logout
        def logout
          cookies.delete(:app_operator_token)
          render json: { message: "Logged out" }, status: :ok
        end

        # GET /api/v1/admin/auth/me
        def me
          render json: { operator: operator_json(current_operator) }, status: :ok
        end

        private

        skip_before_action :require_operator_auth!, only: [:login]

        def operator_json(op)
          {
            id:          op.id,
            name:        op.name,
            email:       op.email,
            role:        op.role,
            status:      op.status,
            tenant_id:   op.tenant_id,
            tenant_slug: op.tenant&.slug
          }
        end
      end
    end
  end
end
