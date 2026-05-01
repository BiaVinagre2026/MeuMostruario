# frozen_string_literal: true

module Api
  module V1
    class LooksController < ApplicationController
      def index
        looks = Look.published.includes(:collection, look_items: :product)
        render json: { looks: looks.map { |l| look_summary(l) } }
      end

      def show
        look = Look.published
                   .includes(:collection, look_items: { product: [:images, :variants, :category, :collection] })
                   .find_by!(slug: params[:id])
        render json: { look: look_detail(look) }
      end

      private

      def look_summary(l)
        {
          id: l.id, slug: l.slug, name: l.name,
          description: l.description,
          cover_url: l.cover_url,
          status: l.status,
          position: l.position,
          collection: l.collection && { id: l.collection.id, name: l.collection.name, slug: l.collection.slug },
          product_count: l.look_items.size
        }
      end

      def look_detail(l)
        look_summary(l).merge(
          products: l.products.map { |p| product_summary_for_look(p) }
        )
      end

      def product_summary_for_look(p)
        img = p.images.find { |i| i.is_cover } || p.images.first
        {
          id: p.id, slug: p.slug, name: p.name, sku: p.sku,
          price_wholesale: p.price_wholesale, price_retail: p.price_retail,
          currency: p.currency, status: p.status, tags: p.tags,
          category:    p.category    && { id: p.category.id,    name: p.category.name,    slug: p.category.slug },
          collection:  p.collection  && { id: p.collection.id,  name: p.collection.name,  slug: p.collection.slug },
          cover_image: img && { id: img.id, urls: img.urls, is_cover: img.is_cover, alt_text: img.alt_text },
          colors:      p.variants.map(&:color).compact.uniq
        }
      end
    end
  end
end
