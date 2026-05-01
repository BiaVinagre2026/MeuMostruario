# frozen_string_literal: true

module Public
  class HomeController < BaseController
    def index
      @collections       = Collection.published.limit(6)
      @featured_products = Product.published
                                  .includes(:images, :variants, :category, :collection)
                                  .limit(8)
      @looks             = Look.published.includes(:products).limit(4)
    end
  end
end
