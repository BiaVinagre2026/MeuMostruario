# frozen_string_literal: true

module Public
  class ProductsController < BaseController
    def index
      @collections = Collection.published.to_a
      @categories  = Category.where(parent_id: nil).to_a
      @products    = Product.published
                            .includes(:category, :collection, :images, :variants)

      if params[:colecao].present?
        @active_collection = Collection.published.find_by(slug: params[:colecao])
        @products = @products.where(collection: @active_collection) if @active_collection
      end

      if params[:categoria].present?
        @active_category = Category.find_by(slug: params[:categoria])
        @products = @products.where(category: @active_category) if @active_category
      end

      @products = @products.search(params[:q]) if params[:q].present?
      @products = @products.limit(48)
    end

    def show
      @product = Product.published
                        .includes(:category, :collection, :images, :variants)
                        .find_by(slug: params[:slug])
      unless @product
        render plain: "Produto não encontrado", status: :not_found
        return
      end
      @related = Product.published
                        .where(collection_id: @product.collection_id)
                        .where.not(id: @product.id)
                        .includes(:images)
                        .limit(4)
    end
  end
end
