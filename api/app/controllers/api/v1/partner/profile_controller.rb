# frozen_string_literal: true

module Api
  module V1
    module Partner
      class ProfileController < BaseController
        def show
          render json: { partner: partner_json(current_partner) }
        end

        def update
          if current_partner.update(profile_params)
            render json: { partner: partner_json(current_partner) }
          else
            render json: { errors: current_partner.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def regenerate_api_key
          current_partner.update!(api_key: SecureRandom.hex(32))
          render json: { api_key: current_partner.api_key }
        end

        private

        def profile_params
          params.permit(:name, :phone, :contact_name, :website, :description)
        end

        def partner_json(p)
          {
            id:           p.id,
            name:         p.name,
            email:        p.email,
            phone:        p.phone,
            status:       p.status,
            api_key:      p.api_key,
            created_at:   p.created_at
          }
        end
      end
    end
  end
end
