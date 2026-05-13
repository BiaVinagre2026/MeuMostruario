# frozen_string_literal: true

module Api
  module V1
    module Admin
      class CatalogsController < BaseController
        def index
          catalogs = paginate(Catalog.includes(:catalog_items, :catalog_links))
          render json: {
            catalogs: catalogs.map { |catalog| catalog_json(catalog) },
            meta: pagination_meta(catalogs)
          }
        end

        def show
          catalog = Catalog.includes(catalog_items: [:product, :photo], catalog_links: []).find(params[:id])
          render json: { catalog: catalog_json(catalog, include_items: true) }
        end

        def create
          catalog = Catalog.create!(catalog_params.merge(created_by_id: current_operator&.id))
          replace_items!(catalog)
          render json: { catalog: catalog_json(catalog.reload, include_items: true) }, status: :created
        end

        def update
          catalog = Catalog.find(params[:id])
          catalog.update!(catalog_params)
          replace_items!(catalog) if params.key?(:items) || params.key?(:product_ids) || params.key?(:photo_ids)
          render json: { catalog: catalog_json(catalog.reload, include_items: true) }
        end

        private

        def catalog_params
          params.require(:catalog).permit(:name, :description, :status, :source)
        end

        def replace_items!(catalog)
          items = Array(params[:items])
          if items.empty?
            Array(params[:product_ids]).each { |id| items << { product_id: id } }
            Array(params[:photo_ids]).each { |id| items << { photo_id: id } }
          end

          return if items.empty?

          catalog.catalog_items.destroy_all
          items.each_with_index do |raw, index|
            data = raw.respond_to?(:to_unsafe_h) ? raw.to_unsafe_h : raw.to_h
            catalog.catalog_items.create!(
              product_id: data["product_id"] || data[:product_id],
              photo_id: data["photo_id"] || data[:photo_id],
              position: data["position"] || index,
              visible: data.key?("visible") ? data["visible"] : true,
              metadata: data["metadata"] || {}
            )
          end
        end

        def catalog_json(catalog, include_items: false)
          json = {
            id: catalog.id,
            name: catalog.name,
            description: catalog.description,
            status: catalog.status,
            source: catalog.source,
            items_count: catalog.catalog_items.size,
            links: catalog.catalog_links.map { |link| link_json(link) },
            created_at: catalog.created_at,
            updated_at: catalog.updated_at
          }
          json[:items] = catalog.catalog_items.map { |item| item_json(item) } if include_items
          json
        end

        def item_json(item)
          {
            id: item.id,
            product_id: item.product_id,
            photo_id: item.photo_id,
            position: item.position,
            visible: item.visible,
            product_name: item.product&.name,
            photo_url: item.photo&.display_url
          }
        end

        def link_json(link)
          {
            id: link.id,
            token: link.token,
            slug: link.slug,
            link_type: link.link_type,
            show_prices: link.show_prices,
            allow_order: link.allow_order,
            allow_payment: link.allow_payment,
            expires_at: link.expires_at
          }
        end
      end
    end
  end
end
