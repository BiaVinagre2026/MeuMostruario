# frozen_string_literal: true

module Api
  module V1
    class CategoriesController < ApplicationController
      def index
        scope      = Category.where(parent_id: nil).includes(:subcategories).order(:position)
        categories = paginate(scope)
        counts     = Product.published.group(:category_id).count
        render json: {
          categories: categories.map { |c| category_json(c, counts) },
          meta: pagination_meta(categories)
        }
      end

      private

      def category_json(c, counts = {})
        {
          id: c.id, slug: c.slug, name: c.name, position: c.position,
          count: counts[c.id].to_i,
          subcategories: c.subcategories.map do |s|
            { id: s.id, slug: s.slug, name: s.name, count: counts[s.id].to_i }
          end
        }
      end
    end
  end
end
