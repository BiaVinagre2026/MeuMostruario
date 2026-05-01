# frozen_string_literal: true

module Api
  module V1
    module Admin
      class ProductVariantsController < BaseController

        # POST /api/v1/admin/products/:product_id/variants
        def create
          product = Product.find(params[:product_id])
          variant = product.variants.build(variant_params)
          if variant.save
            render json: { variant: variant_json(variant) }, status: :created
          else
            render json: { errors: variant.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # PATCH /api/v1/admin/products/:product_id/variants/:id
        def update
          variant = find_variant
          if variant.update(variant_params)
            render json: { variant: variant_json(variant) }
          else
            render json: { errors: variant.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # DELETE /api/v1/admin/products/:product_id/variants/:id
        def destroy
          find_variant.destroy!
          render json: { message: "Variant deleted" }
        end

        private

        def find_variant
          product = Product.find(params[:product_id])
          product.variants.find(params[:id])
        end

        def variant_params
          params.require(:variant).permit(
            :color, :color_hex, :size,
            :stock_qty, :price_override,
            :image_url, :position
          )
        end

        def variant_json(v)
          {
            id:             v.id,
            product_id:     v.product_id,
            color:          v.color,
            color_hex:      v.color_hex,
            size:           v.size,
            stock_qty:      v.stock_qty,
            price_override: v.price_override,
            image_url:      v.image_url,
            position:       v.position,
            created_at:     v.created_at,
            updated_at:     v.updated_at
          }
        end
      end
    end
  end
end
