# frozen_string_literal: true

module Public
  class SitemapsController < BaseController
    layout false

    def show
      @products    = Product.published.select(:slug, :updated_at)
      @collections = Collection.published.select(:slug, :updated_at)
      @looks       = Look.published.select(:slug, :updated_at)
      respond_to { |f| f.xml }
    end
  end
end
