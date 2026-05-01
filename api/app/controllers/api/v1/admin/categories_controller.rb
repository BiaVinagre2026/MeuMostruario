# frozen_string_literal: true

module Api
  module V1
    module Admin
      class CategoriesController < BaseController

        # GET /api/v1/admin/categories
        def index
          categories = Category.left_joins(:products)
                               .select("categories.*, COUNT(products.id) AS products_count")
                               .group("categories.id")
                               .order(:position)
          render json: { categories: categories.map { |c| category_json(c) } }
        end

        # POST /api/v1/admin/categories
        def create
          category = Category.new(category_params)
          if category.save
            render json: { category: category_json(category) }, status: :created
          else
            render json: { errors: category.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # PATCH /api/v1/admin/categories/:id
        def update
          category = Category.find(params[:id])
          if category.update(category_params)
            render json: { category: category_json(category) }
          else
            render json: { errors: category.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # DELETE /api/v1/admin/categories/:id
        def destroy
          category = Category.find(params[:id])
          if category.products.exists?
            return render json: { error: "Cannot delete a category that has products" },
                          status: :unprocessable_entity
          end
          category.destroy!
          render json: { message: "Category deleted" }
        end

        private

        def category_params
          params.require(:category).permit(:name, :slug, :position, :parent_id)
        end

        def category_json(c)
          {
            id:             c.id,
            name:           c.name,
            slug:           c.slug,
            position:       c.position,
            parent_id:      c.parent_id,
            products_count: c.try(:products_count).to_i,
            created_at:     c.created_at,
            updated_at:     c.updated_at
          }
        end
      end
    end
  end
end
