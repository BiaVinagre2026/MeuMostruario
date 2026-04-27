# frozen_string_literal: true

module Api
  module V1
    class ProductsController < ApplicationController
      def index
        scope = Product.published.includes(:category, :collection, :images, :variants)
        scope = scope.by_collection(params[:collection_id])   if params[:collection_id].present?
        scope = scope.where(category_id: params[:category_id]) if params[:category_id].present?
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

      def product_summary(p)
        {
          id: p.id, slug: p.slug, name: p.name, sku: p.sku,
          price_wholesale: p.price_wholesale, price_retail: p.price_retail, currency: p.currency,
          status: p.status, tags: p.tags,
          category:   p.category   && { id: p.category.id,   name: p.category.name,   slug: p.category.slug },
          collection: p.collection && { id: p.collection.id, name: p.collection.name, slug: p.collection.slug },
          cover_image: cover_image_json(p),
          colors: p.variants.map(&:color).compact.uniq
        }
      end

      def product_detail(p)
        product_summary(p).merge(
          description:        p.description,
          fabric_composition: p.fabric_composition,
          care_instructions:  p.care_instructions,
          size_guide:         p.size_guide,
          whatsapp_message:   p.whatsapp_message,
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
          sku: v.sku, stock_qty: v.stock_qty, price_override: v.price_override }
      end
    end
  end
end
