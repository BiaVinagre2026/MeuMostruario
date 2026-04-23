# frozen_string_literal: true

module Api
  module V1
    module Admin
      class UploadsController < BaseController
        def create
          file = params[:file]
          return render json: { error: "No file uploaded" }, status: :bad_request if file.blank?

          url = ImageStorageService.store(file, current_tenant.slug, current_tenant.tenant_config)
          render json: { url: url }, status: :ok
        rescue => e
          render json: { error: e.message }, status: :unprocessable_entity
        end
      end
    end
  end
end
