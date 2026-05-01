# frozen_string_literal: true

module Public
  class CollectionsController < BaseController
    def show
      @collection = Collection.published.find_by(slug: params[:slug])
      unless @collection
        render plain: "Coleção não encontrada", status: :not_found
        return
      end
      @products = Product.published
                         .where(collection: @collection)
                         .includes(:images, :variants, :category)
    end
  end
end
