# frozen_string_literal: true

module Api
  module V1
    module Admin
      class PhotosController < BaseController
        def bulk_update
          photos = Photo.where(id: photo_ids)
          return render json: { errors: ["nenhuma foto encontrada"] }, status: :not_found if photos.empty?

          updated = photos.map { |photo| update_photo!(photo) }
          photos.first&.photo_batch&.refresh_counts!

          render json: { photos: updated.map { |photo| photo_json(photo.reload) } }
        end

        private

        def photo_ids
          Array(params[:photo_ids] || params[:ids]).map(&:to_i).reject(&:zero?)
        end

        def update_photo!(photo)
          attrs = photo_params.to_h.compact_blank
          apply_suggestions!(photo, attrs) if truthy_param?(:apply_suggestions)
          attrs[:reviewed_at] = Time.current if attrs.key?(:status) || attrs.key?(:approved_color)
          attrs[:status] = "approved" if truthy_param?(:approve) || truthy_param?(:apply_suggestions)

          if truthy_param?(:create_product)
            product = create_product_from_photo!(photo)
            attrs[:product_id] = product.id
          end

          photo.update!(attrs)
          sync_product_image!(photo) if photo.product_id.present?
          photo
        end

        def photo_params
          params.permit(
            :product_id,
            :product_variant_id,
            :approved_color,
            :approved_pantone,
            :approved_model,
            :approved_size_group,
            :status
          )
        end

        def create_product_from_photo!(photo)
          name = photo.approved_model.presence || photo.suggested_model.presence ||
                 photo.original_filename.to_s.sub(/\.[^.]+\z/, "").presence || "Produto #{photo.id}"
          Product.create!(
            name: name,
            sku: "FOTO-#{photo.id}",
            status: "draft",
            price_wholesale: 0,
            price_retail: 0,
            currency: "BRL"
          )
        end

        def sync_product_image!(photo)
          product = Product.find(photo.product_id)
          image = product.images.find_or_initialize_by(photo_id: photo.id)
          image.urls = photo.urls
          image.is_cover = product.images.where.not(id: image.id).none?
          image.position ||= (product.images.maximum(:position) || 0) + 1
          image.visual_metadata = {
            "approved_color" => photo.approved_color,
            "pantone" => photo.approved_pantone,
            "size_group" => photo.approved_size_group,
            "model" => photo.approved_model
          }.compact
          image.save!
        end

        def photo_json(photo)
          {
            id: photo.id,
            product_id: photo.product_id,
            product_name: photo.product&.name,
            display_url: photo.display_url,
            status: photo.status,
            approved_color: photo.approved_color,
            approved_pantone: photo.approved_pantone,
            approved_model: photo.approved_model,
            approved_size_group: photo.approved_size_group
          }
        end

        def apply_suggestions!(photo, attrs)
          attrs[:approved_color] ||= photo.suggested_color
          attrs[:approved_pantone] ||= photo.suggested_pantone
          attrs[:approved_model] ||= photo.suggested_model
          attrs[:approved_size_group] ||= photo.suggested_size_group

          suggested_sku = photo.metadata&.dig("suggested_sku")
          return if suggested_sku.blank?

          product = Product.find_by(sku: suggested_sku)
          return unless product

          attrs[:product_id] ||= product.id
          variant = find_variant_for_photo(product, attrs)
          attrs[:product_variant_id] ||= variant&.id
        end

        def find_variant_for_photo(product, attrs)
          color = attrs[:approved_color]
          size_group = attrs[:approved_size_group]

          product.variants.find_by(color: color, size_group: size_group) ||
            product.variants.find_by(color: color) ||
            product.variants.find_by(size_group: size_group) ||
            product.variants.first
        end

        def truthy_param?(key)
          value = params[key]
          value == true || value == "true"
        end
      end
    end
  end
end
