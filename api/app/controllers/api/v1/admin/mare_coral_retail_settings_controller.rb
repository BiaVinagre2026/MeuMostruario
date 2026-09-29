# frozen_string_literal: true

module Api
  module V1
    module Admin
      class MareCoralRetailSettingsController < BaseController
        before_action :require_retail_storefront!
        before_action :set_retail_link

        def show
          render json: settings_json
        end

        def update
          shipping = normalized_shipping_settings
          metadata = @retail_link.metadata.to_h.deep_dup
          metadata["retail_storefront"] ||= {}
          metadata["retail_storefront"]["enabled"] = true
          metadata["retail_storefront"]["shipping"] = shipping
          @retail_link.update!(metadata: metadata)
          render json: settings_json
        rescue ArgumentError => e
          render json: { errors: [e.message] }, status: :unprocessable_entity
        end

        private

        def require_retail_storefront!
          render json: { error: "not found" }, status: :not_found unless current_tenant&.feature?(:retail_storefront)
        end

        def set_retail_link
          @retail_link = CatalogLink.active.detect do |link|
            link.metadata.to_h.dig("retail_storefront", "enabled") == true
          end
          render json: { error: "vitrine varejista da Mare Coral nao configurada" }, status: :not_found unless @retail_link
        end

        def normalized_shipping_settings
          enabled = ActiveModel::Type::Boolean.new.cast(params[:enabled])
          flat_rate = decimal_or_nil(params[:flat_rate], "valor do frete")
          threshold = decimal_or_nil(params[:free_shipping_threshold], "limite de frete gratis")
          days = params[:estimated_days].present? ? Integer(params[:estimated_days], exception: false) : nil
          if params[:estimated_days].present? && !days&.between?(1, 90)
            raise ArgumentError, "prazo deve ficar entre 1 e 90 dias"
          end
          if enabled && flat_rate.nil? && !threshold&.positive?
            raise ArgumentError, "informe o valor do frete ou o limite de frete gratis para ativar"
          end

          postal_code = params[:origin_postal_code].to_s.gsub(/\D/, "").presence
          raise ArgumentError, "CEP de origem deve ter 8 digitos" if postal_code && !postal_code.match?(/\A\d{8}\z/)

          {
            "enabled" => enabled,
            "flat_rate" => flat_rate&.to_s("F"),
            "free_shipping_threshold" => threshold&.to_s("F"),
            "estimated_days" => days,
            "origin_postal_code" => postal_code
          }
        end

        def decimal_or_nil(value, label)
          return nil if value.blank?
          number = BigDecimal(value.to_s.tr(",", "."))
          raise ArgumentError unless number.finite? && !number.negative?
          number
        rescue ArgumentError
          raise ArgumentError, "#{label} invalido"
        end

        def settings_json
          shipping = @retail_link.metadata.to_h.dig("retail_storefront", "shipping") || {}
          {
            catalog_link_id: @retail_link.id,
            enabled: shipping["enabled"] == true,
            flat_rate: shipping["flat_rate"],
            free_shipping_threshold: shipping["free_shipping_threshold"],
            estimated_days: shipping["estimated_days"],
            origin_postal_code: shipping["origin_postal_code"]
          }
        end
      end
    end
  end
end
