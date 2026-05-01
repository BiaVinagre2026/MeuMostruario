# frozen_string_literal: true

module Api
  module V1
    module Admin
      class CollectionsController < BaseController

        # GET /api/v1/admin/collections
        def index
          collections = Collection.left_joins(:products)
                                  .select("collections.*, COUNT(products.id) AS products_count")
                                  .group("collections.id")
                                  .order(:position)
          render json: { collections: collections.map { |c| collection_summary_json(c) } }
        end

        # GET /api/v1/admin/collections/:id
        def show
          collection = Collection.find(params[:id])
          products   = collection.products
                                  .includes(:images)
                                  .map { |p| collection_product_json(p) }
          render json: { collection: collection_full_json(collection, products) }
        end

        # POST /api/v1/admin/collections
        def create
          collection = Collection.new(collection_params)
          if collection.save
            render json: { collection: collection_summary_json(collection) }, status: :created
          else
            render json: { errors: collection.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # PATCH /api/v1/admin/collections/:id
        def update
          collection = Collection.find(params[:id])
          if collection.update(collection_params)
            render json: { collection: collection_summary_json(collection) }
          else
            render json: { errors: collection.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # DELETE /api/v1/admin/collections/:id
        def destroy
          collection = Collection.find(params[:id])
          if collection.products.exists?
            return render json: { error: "Cannot delete a collection that has products" },
                          status: :unprocessable_entity
          end
          collection.destroy!
          render json: { message: "Collection deleted" }
        end

        private

        def collection_params
          params.require(:collection).permit(
            :name, :slug, :description, :cover_url, :status, :position
          )
        end

        def collection_summary_json(c)
          {
            id:             c.id,
            name:           c.name,
            slug:           c.slug,
            description:    c.description,
            cover_url:      c.cover_url,
            status:         c.status,
            position:       c.position,
            products_count: c.try(:products_count).to_i,
            created_at:     c.created_at,
            updated_at:     c.updated_at
          }
        end

        def collection_full_json(c, products)
          {
            id:          c.id,
            name:        c.name,
            slug:        c.slug,
            description: c.description,
            cover_url:   c.cover_url,
            status:      c.status,
            position:    c.position,
            created_at:  c.created_at,
            updated_at:  c.updated_at,
            products:    products
          }
        end

        def collection_product_json(p)
          cover = p.images.find(&:is_cover) || p.images.first
          {
            id:        p.id,
            name:      p.name,
            sku:       p.sku,
            cover_url: cover ? cover.urls&.dig("original") : nil
          }
        end
      end
    end
  end
end
