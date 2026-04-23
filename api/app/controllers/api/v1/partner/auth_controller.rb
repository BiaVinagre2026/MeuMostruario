# frozen_string_literal: true

module Api
  module V1
    module Partner
      class AuthController < BaseController
        skip_before_action :require_partner_auth!, only: [:login]

        def login
          result = PartnerAuthService.authenticate(params[:email], params[:password])
          partner = result[:partner]

          cookies.signed[:app_partner_token] = {
            value:     result[:token],
            httponly:  true,
            same_site: :lax,
            expires:   8.hours.from_now,
            secure:    Rails.env.production?
          }

          render json: { partner: partner_json(partner) }, status: :ok
        rescue PartnerAuthService::AuthenticationError => e
          render json: { error: e.message }, status: :unauthorized
        end

        def logout
          cookies.delete(:app_partner_token)
          render json: { message: "Logged out" }, status: :ok
        end

        def me
          render json: { partner: partner_json(current_partner) }, status: :ok
        end

        private

        def partner_json(p)
          {
            id:     p.id,
            name:   p.name,
            email:  p.email,
            phone:  p.phone,
            status: p.status
          }
        end
      end
    end
  end
end
