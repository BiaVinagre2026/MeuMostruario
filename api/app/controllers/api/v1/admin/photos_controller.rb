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
          attrs[:reviewed_at] = Time.current if attrs.key?(:status) || attrs.key?(:approved_color)
          attrs[:status] = "approved" if params[:approve] == true || params[:approve] == "true"

          if params[:create_product] == true || params[:create_product] == "true"
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
      end
    end
  end
end
