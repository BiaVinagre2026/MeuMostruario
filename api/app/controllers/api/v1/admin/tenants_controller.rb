# frozen_string_literal: true

module Api
  module V1
    module Admin
      class TenantsController < BaseController
        before_action :require_super_admin!
        before_action :find_tenant, only: [:show, :update, :destroy]

        def tenant_required? = false

        def index
          tenants = Tenant.order(:name)
          render json: { tenants: tenants.map { |t| tenant_json(t) } }
        end

        def show
          render json: { tenant: tenant_json(@tenant) }
        end

        def create
          tenant = Tenant.new(tenant_create_params)

          unless tenant.valid?
            return render json: { errors: tenant.errors.full_messages },
                          status: :unprocessable_entity
          end

          ActiveRecord::Base.transaction do
            tenant.save!
            TenantConfig.create!(
              tenant:         tenant,
              email_provider: "letter_opener"
            )
            TenantProvisioner.provision!(tenant)
          end

          render json: { tenant: tenant_json(tenant) }, status: :created
        rescue ActiveRecord::RecordInvalid => e
          render json: { errors: [e.message] }, status: :unprocessable_entity
        rescue => e
          Rails.logger.error("Tenant provisioning failed: #{e.message}")
          render json: { error: "Failed to provision tenant: #{e.message}" },
                 status: :internal_server_error
        end

        def update
          if @tenant.update(tenant_update_params)
            render json: { tenant: tenant_json(@tenant) }
          else
            render json: { errors: @tenant.errors.full_messages },
                   status: :unprocessable_entity
          end
        end

        def destroy
          @tenant.update!(status: "suspended")
          head :no_content
        end

        private

        def find_tenant
          @tenant = Tenant.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Tenant not found" }, status: :not_found
        end

        def tenant_create_params
          params.require(:tenant).permit(:name, :slug, :plan, :custom_domain)
        end

        def tenant_update_params
          params.require(:tenant).permit(:name, :plan, :status, :custom_domain)
        end

        def tenant_json(tenant)
          {
            id:            tenant.id,
            slug:          tenant.slug,
            name:          tenant.name,
            plan:          tenant.plan,
            status:        tenant.status,
            custom_domain: tenant.custom_domain,
            schema_name:   tenant.schema_name,
            created_at:    tenant.created_at.iso8601
          }
        end
      end
    end
  end
end
