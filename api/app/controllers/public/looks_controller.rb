# frozen_string_literal: true

module Public
  class LooksController < BaseController
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
