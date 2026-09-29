# frozen_string_literal: true

module Api
  module V1
    module Admin
      class MareCoralStorefrontController < BaseController
        before_action :require_mare_coral_tenant!
        before_action :set_retail_link

        def show
          render json: storefront_json
        end

        def update
          product_ids = normalized_product_ids
          products = Product.published.includes(:images, :variants).where(id: product_ids).index_by(&:id)
          missing_ids = product_ids - products.keys
          raise ArgumentError, "selecione somente produtos publicados da Maré Coral" if missing_ids.any?

          ineligible = products.values.reject { |product| eligible?(product) }
          if ineligible.any?
            names = ineligible.map(&:name).join(", ")
            raise ArgumentError, "complete preço e estoque antes de publicar: #{names}"
          end

          CatalogItem.transaction do
            items_by_product = @retail_link.catalog.catalog_items.where.not(product_id: nil).group_by(&:product_id)

            items_by_product.each_value do |items|
              items.each { |item| item.update!(visible: false) }
            end

            product_ids.each_with_index do |product_id, position|
              existing_items = items_by_product[product_id] || []
              item = existing_items.find(&:visible?) || existing_items.first
              item ||= @retail_link.catalog.catalog_items.build(product_id: product_id)
              item.update!(visible: true, position: position)
              existing_items.reject { |candidate| candidate.id == item.id }.each do |duplicate|
                duplicate.update!(visible: false)
              end
            end
          end

          render json: storefront_json
        rescue ArgumentError => e
          render json: { errors: [e.message] }, status: :unprocessable_entity
        end

        private

        def require_mare_coral_tenant!
          render json: { error: "not found" }, status: :not_found unless current_tenant&.slug == "mare-coral"
        end

        def set_retail_link
          @retail_link = CatalogLink.active.detect do |link|
            link.metadata.to_h.dig("retail_storefront", "enabled") == true
          end
          render json: { error: "vitrine varejista da Maré Coral não configurada" }, status: :not_found unless @retail_link
        end

        def normalized_product_ids
          raw_ids = params.require(:product_ids)
          raise ArgumentError, "product_ids deve ser uma lista" unless raw_ids.is_a?(Array)

          ids = raw_ids.map { |id| Integer(id, exception: false) }
          raise ArgumentError, "há um produto inválido na seleção" if ids.any?(&:nil?)
          raise ArgumentError, "um produto não pode aparecer duas vezes" if ids.uniq.length != ids.length

          ids
        end

        def eligible?(product)
          product.price_retail.to_d.positive? && product.variants.any? { |variant| variant.stock_qty.to_i.positive? }
        end

        def eligibility_reasons(product)
          reasons = []
          reasons << "Informe o preço de varejo" unless product.price_retail.to_d.positive?
          reasons << "Cadastre ao menos uma variação com estoque" unless product.variants.any? { |variant| variant.stock_qty.to_i.positive? }
          reasons
        end

        def storefront_json
          catalog = @retail_link.catalog
          visible_items = catalog.catalog_items.select(&:visible).select(&:product_id)
          selected_by_product = visible_items.group_by(&:product_id).transform_values(&:first)
          products = Product.published.includes(:images, :variants).to_a
          ordered_products = products.sort_by do |product|
            item = selected_by_product[product.id]
            item ? [0, item.position.to_i, product.id] : [1, product.position.to_i, product.name.downcase]
          end

          {
            catalog: {
              id: catalog.id,
              name: catalog.name,
              catalog_link_id: @retail_link.id,
              selected_count: selected_by_product.length
            },
            products: ordered_products.map do |product|
              item = selected_by_product[product.id]
              {
                id: product.id,
                name: product.name,
                sku: product.sku,
                slug: product.slug,
                price_retail: product.price_retail,
                cover_url: cover_url_for(product.cover_image),
                variants_count: product.variants.length,
                stock_qty: product.variants.sum { |variant| variant.stock_qty.to_i },
                selected: item.present?,
                storefront_position: item&.position,
                eligible: eligible?(product),
                eligibility_reasons: eligibility_reasons(product)
              }
            end
          }
        end

        def cover_url_for(image)
          return nil unless image&.urls.is_a?(Hash)

          image.urls["thumb"] || image.urls["small"] || image.urls["regular"] || image.urls["original"] || image.urls.values.compact.first
        end
      end
    end
  end
end
