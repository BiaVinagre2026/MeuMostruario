# frozen_string_literal: true

module Public
  class LooksController < BaseController
    def index
      @collections = Collection.published.to_a
      @looks = Look.published
                   .includes(:collection, look_items: { product: [:images, :variants] })

      if params[:colecao].present?
        @active_collection = Collection.published.find_by(slug: params[:colecao])
        @looks = @looks.where(collection: @active_collection) if @active_collection
      end

      @looks = @looks.limit(36)
    end

    def show
      @look = Look.published
                  .includes(look_items: { product: [:images, :variants, :category] })
                  .find_by(slug: params[:slug])
      unless @look
        render plain: "Look não encontrado", status: :not_found
        return
      end
    end
  end
end
