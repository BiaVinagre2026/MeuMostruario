# frozen_string_literal: true

module Api
  module V1
    module Admin
      class ProductsController < BaseController

        # GET /api/v1/admin/products
        def index
          scope = Product.includes(:collection, :images, :variants)

          scope = scope.where(status: params[:status]) if params[:status].present?
          scope = scope.by_collection(params[:collection_id]) if params[:collection_id].present?

          if params[:q].present?
            q = "%#{ActiveRecord::Base.sanitize_sql_like(params[:q].strip)}%"
            scope = scope.where("name ILIKE :q OR sku ILIKE :q", q: q)
          end

          products = paginate(scope)
          render json: {
            products: products.map { |p| product_summary_json(p) },
            meta:     pagination_meta(products)
          }
        end

        # GET /api/v1/admin/products/:id
        def show
          product = Product.includes(:collection, :category, :images, :variants).find(params[:id])
          render json: { product: product_full_json(product) }
        end

        # POST /api/v1/admin/products
        def create
          product = Product.new(product_params)
          if product.save
            product.reload
            render json: { product: product_full_json(product) }, status: :created
          else
            render json: { errors: product.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # PATCH /api/v1/admin/products/:id
        def update
          product = Product.find(params[:id])
          if product.update(product_params)
            product.reload
            render json: { product: product_full_json(product) }
          else
            render json: { errors: product.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # DELETE /api/v1/admin/products/:id
        def destroy
          product = Product.find(params[:id])
          product.destroy!
          render json: { message: "Product deleted" }
        end

        private

        def product_params
          params.require(:product).permit(
            :name, :sku, :slug, :description,
            :price_wholesale, :price_retail, :currency,
            :status, :collection_id, :category_id,
            :fabric_composition, :care_instructions,
            :position,
            tags: []
          )
        end

        SIZE_ORDER = %w[PP P M G GG XGG Único].freeze
        SIZE_GROUP_ORDER = ["P/M", "M/G", "Unico", "Plus 1", "Plus 2"].freeze

        def product_summary_json(p)
          cover = p.images.find(&:is_cover) || p.images.first

          raw_stock = p.variants.each_with_object(Hash.new(0)) do |v, h|
            key = v.size_group.presence || v.size.to_s
            h[key] += v.stock_qty.to_i if key.present?
          end
          stock_by_size = (SIZE_GROUP_ORDER + SIZE_ORDER)
            .filter_map { |s| [s, raw_stock[s]] if raw_stock.key?(s) }
            .concat(raw_stock.reject { |s, _| (SIZE_GROUP_ORDER + SIZE_ORDER).include?(s) }.to_a)
            .to_h

          {
            id:              p.id,
            name:            p.name,
            sku:             p.sku,
            slug:            p.slug,
            status:          p.status,
            price_wholesale: p.price_wholesale,
            price_retail:    p.price_retail,
            collection:      p.collection ? { id: p.collection.id, name: p.collection.name } : nil,
            cover_url:       cover_url_for(cover),
            pantone:         cover&.pantone,
            approved_color:  cover&.approved_color,
            size_group:      cover&.size_group,
            variants_count:  p.variants.size,
            stock_by_size:   stock_by_size,
            created_at:      p.created_at
          }
        end

        def cover_url_for(img)
          return nil unless img&.urls.is_a?(Hash)
          img.urls["thumb"] || img.urls["small"] || img.urls["regular"] || img.urls["original"] || img.urls.values.compact.first
        end

        def product_full_json(p)
          {
            id:                  p.id,
            name:                p.name,
            sku:                 p.sku,
            slug:                p.slug,
            description:         p.description,
            status:              p.status,
            price_wholesale:     p.price_wholesale,
            price_retail:        p.price_retail,
            currency:            p.currency,
            fabric_composition:  p.fabric_composition,
            care_instructions:   p.care_instructions,
            tags:                p.tags,
            collection_id:       p.collection_id,
            category_id:         p.category_id,
            position:            p.position,
            collection:          p.collection ? { id: p.collection.id, name: p.collection.name } : nil,
            category:            p.category ? { id: p.category.id, name: p.category.name } : nil,
            images:              p.images.map { |img| image_json(img) },
            variants:            p.variants.map { |v| variant_json(v) },
            created_at:          p.created_at,
            updated_at:          p.updated_at
          }
        end

        def image_json(img)
          {
            id:       img.id,
            photo_id: img.photo_id,
            urls:     img.urls,
            visual_metadata: img.visual_metadata,
            pantone:  img.pantone,
            approved_color: img.approved_color,
            size_group: img.size_group,
            is_cover: img.is_cover,
            position: img.position
          }
        end

        def variant_json(v)
          {
            id:             v.id,
            color:          v.color,
            color_hex:      v.color_hex,
            pantone:        v.pantone,
            size:           v.size,
            size_group:     v.size_group,
            stock_qty:      v.stock_qty,
            price_override: v.price_override,
            image_url:      v.image_url,
            position:       v.position
          }
        end
      end
    end
  end
end
