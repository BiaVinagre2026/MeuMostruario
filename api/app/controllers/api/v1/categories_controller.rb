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
        {
          id: c.id, slug: c.slug, name: c.name, position: c.position,
          subcategories: c.subcategories.map { |s| { id: s.id, slug: s.slug, name: s.name } }
        }
      end
    end
  end
end
