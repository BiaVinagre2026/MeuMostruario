# frozen_string_literal: true

module Api
  module V1
    class CategoriesController < ApplicationController
      def index
        categories = Category.where(parent_id: nil).includes(:subcategories)
        render json: { categories: categories.map { |c| category_json(c) } }
      end

      private

      def category_json(c)
        category_ids = [c.id, *c.subcategories.map(&:id)]

        {
          id: c.id, slug: c.slug, name: c.name, position: c.position,
          product_count: Product.published.where(category_id: category_ids).count,
          subcategories: c.subcategories.map do |s|
            { id: s.id, slug: s.slug, name: s.name, product_count: Product.published.where(category_id: s.id).count }
          end
        }
      end
    end
  end
end
