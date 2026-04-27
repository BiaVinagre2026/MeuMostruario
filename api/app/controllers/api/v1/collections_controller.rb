# frozen_string_literal: true

module Api
  module V1
    class CollectionsController < ApplicationController
      def index
        collections = Collection.published.includes(:products)
        render json: { collections: collections.map { |c| collection_json(c) } }
      end

      def show
        collection = Collection.published.find_by!(slug: params[:id])
        products   = Product.published.by_collection(collection.id)
                            .includes(:images, :variants, :category)
        render json: {
          collection: collection_json(collection),
          products:   products.map { |p| product_summary(p) }
        }
      end

      private

      def collection_json(c)
        {
          id: c.id, slug: c.slug, name: c.name, description: c.description,
          cover_url: c.cover_url, status: c.status, launched_at: c.launched_at,
          product_count: c.products.size
        }
      end

      def product_summary(p)
        img = p.images.find { |i| i.is_cover } || p.images.first
        {
          id: p.id, slug: p.slug, name: p.name,
          price_wholesale: p.price_wholesale, price_retail: p.price_retail, currency: p.currency,
          tags: p.tags,
          cover_image: img && { id: img.id, urls: img.urls, alt_text: img.alt_text },
          colors: p.variants.map(&:color).compact.uniq
        }
      end
    end
  end
end
