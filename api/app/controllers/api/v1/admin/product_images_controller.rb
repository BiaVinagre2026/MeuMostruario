# frozen_string_literal: true

module Api
  module V1
    module Admin
      class ProductImagesController < BaseController

        # POST /api/v1/admin/products/:product_id/images
        def create
          product   = Product.find(params[:product_id])
          image_url = params[:image_url].to_s.strip

          if image_url.blank?
            return render json: { error: "image_url is required" }, status: :bad_request
          end

          urls = build_urls(image_url)
          is_cover = ActiveRecord::Type::Boolean.new.cast(params[:is_cover])

          image = product.images.build(urls: urls, is_cover: is_cover,
                                       position: next_position(product))

          if image.save
            render json: { image: image_json(image) }, status: :created
          else
            render json: { errors: image.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # DELETE /api/v1/admin/products/:product_id/images/:id
        def destroy
          product = Product.find(params[:product_id])
          image   = product.images.find(params[:id])
          image.destroy!
          render json: { message: "Image deleted" }
        end

        private

        def build_urls(url)
          { "original" => url, "regular" => url, "small" => url, "thumb" => url }
        end

        def next_position(product)
          (product.images.maximum(:position) || 0) + 1
        end

        def image_json(img)
          {
            id:         img.id,
            product_id: img.product_id,
            urls:       img.urls,
            is_cover:   img.is_cover,
            position:   img.position,
            created_at: img.created_at
          }
        end
      end
    end
  end
end
