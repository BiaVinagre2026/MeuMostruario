# frozen_string_literal: true

module Public
  class ProductsController < BaseController
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
