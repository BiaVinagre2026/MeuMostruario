# frozen_string_literal: true

module Api
  module V1
    module Admin
      class LooksController < BaseController

        # GET /api/v1/admin/looks
        def index
          looks = Look.includes(:collection, :look_items).all
          render json: { looks: looks.map { |l| look_summary(l) } }
        end

        # GET /api/v1/admin/looks/:id
        def show
          look = Look.includes(:collection, look_items: :product).find(params[:id])
          render json: { look: look_detail(look) }
        end

        # POST /api/v1/admin/looks
        def create
          look = Look.new(look_params)
          if look.save
            sync_products(look, params[:product_ids])
            look.reload
            render json: { look: look_detail(look) }, status: :created
          else
            render json: { errors: look.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # PATCH /api/v1/admin/looks/:id
        def update
          look = Look.find(params[:id])
          if look.update(look_params)
            sync_products(look, params[:product_ids]) if params.key?(:product_ids)
            look.reload
            render json: { look: look_detail(look) }
          else
            render json: { errors: look.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # DELETE /api/v1/admin/looks/:id
        def destroy
          look = Look.find(params[:id])
          look.destroy!
          render json: { message: "Look deleted" }
        end

        private

        def look_params
          params.require(:look).permit(
            :name, :description, :cover_url, :status, :position, :collection_id
          )
        end

        def sync_products(look, product_ids)
          return unless product_ids.is_a?(Array)
          look.look_items.destroy_all
          product_ids.compact.each_with_index do |pid, i|
            look.look_items.create!(product_id: pid.to_i, position: i + 1)
          end
        end

        def look_summary(l)
          {
            id: l.id, slug: l.slug, name: l.name,
            description: l.description,
            cover_url: l.cover_url,
            status: l.status,
            position: l.position,
            collection: l.collection && { id: l.collection.id, name: l.collection.name },
            product_count: l.look_items.size
          }
        end

        def look_detail(l)
          look_summary(l).merge(
            products: l.look_items.order(:position).map do |li|
              p = li.product
              next nil unless p
              { id: p.id, name: p.name, sku: p.sku, slug: p.slug }
            end.compact
          )
        end
      end
    end
  end
end
