# frozen_string_literal: true

module Api
  module V1
    class ProductsController < ApplicationController
      def index
        scope = Product.published.includes(:category, :collection, :images, :variants)
        scope = filter_by_collection(scope)
        scope = filter_by_category(scope)
        scope = scope.search(params[:q])                       if params[:q].present?

        products = paginate(scope)
        render json: { products: products.map { |p| product_summary(p) }, meta: pagination_meta(products) }
      end

      def show
        product = Product.published
                         .includes(:category, :collection, :images, :variants)
                         .find_by!(slug: params[:id])
        render json: { product: product_detail(product) }
      end

      private

      SIZE_ORDER = %w[PP P M G GG XGG Único].freeze

      def filter_by_collection(scope)
        return scope unless params[:collection_id].present?

        collection = Collection.find_by(id: params[:collection_id]) || Collection.find_by(slug: params[:collection_id])
        collection ? scope.where(collection_id: collection.id) : scope.none
      end

      def filter_by_category(scope)
        return scope unless params[:category_id].present?

        category = Category.find_by(id: params[:category_id]) || Category.find_by(slug: params[:category_id])
        return scope.none unless category

        scope.where(category_id: [category.id, *category.subcategories.pluck(:id)])
      end

      def product_summary(p)
        seen_sizes  = p.variants.map(&:size).compact.uniq
        sorted_sizes = SIZE_ORDER.select { |s| seen_sizes.include?(s) } +
                       seen_sizes.reject { |s| SIZE_ORDER.include?(s) }
        {
          id: p.id, slug: p.slug, name: p.name, sku: p.sku,
          price_wholesale: p.price_wholesale, price_retail: p.price_retail, currency: p.currency,
          status: p.status, tags: p.tags,
          category:   p.category   && { id: p.category.id,   name: p.category.name,   slug: p.category.slug },
          collection: p.collection && { id: p.collection.id, name: p.collection.name, slug: p.collection.slug },
          cover_image: cover_image_json(p),
          colors: p.variants.map { |v| v.color ? { name: v.color, hex: v.color_hex } : nil }.compact.uniq { |c| c[:name] },
          sizes:  sorted_sizes
        }
      end

      def product_detail(p)
        product_summary(p).merge(
          description:        p.description,
          fabric_composition: p.fabric_composition,
          care_instructions:  p.care_instructions,
          size_guide:         p.size_guide,
          whatsapp_message:   p.whatsapp_message,
          made_in:            p.try(:made_in),
          min_order_qty:      p.try(:min_order_qty),
          images:   p.images.map { |i| image_json(i) },
          variants: p.variants.sort_by(&:position).map { |v| variant_json(v) }
        )
      end

      def cover_image_json(p)
        img = p.images.find { |i| i.is_cover } || p.images.first
        img && image_json(img)
      end

      def image_json(i)
        { id: i.id, urls: i.urls, is_cover: i.is_cover, alt_text: i.alt_text, position: i.position }
      end

      def variant_json(v)
        { id: v.id, size: v.size, color: v.color, color_hex: v.color_hex,
          sku: v.sku, stock_qty: v.stock_qty, price_override: v.price_override,
          image_url: v.try(:image_url) }
      end
    end
  end
end
