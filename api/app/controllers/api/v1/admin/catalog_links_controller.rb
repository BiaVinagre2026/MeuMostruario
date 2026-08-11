# frozen_string_literal: true

module Api
  module V1
    module Admin
      class CatalogLinksController < BaseController
        def create
          catalog = Catalog.find(params[:catalog_id])
          link = catalog.catalog_links.create!(link_params_with_defaults.merge(created_by_id: current_operator&.id))
          render json: { catalog_link: link_json(link) }, status: :created
        end

        # Revogar um link significa expirar agora, nao apagar: pedidos e
        # selecoes ja recebidos continuam apontando para ele.
        def update
          link = CatalogLink.find(params[:id])
          link.update!(update_params)
          render json: { catalog_link: link_json(link) }
        end

        def destroy
          link = CatalogLink.find(params[:id])
          link.destroy!
          head :no_content
        end

        private

        def update_params
          params.require(:catalog_link).permit(:expires_at, :slug, :show_prices, :allow_order, :allow_payment)
        end

        def link_params_with_defaults
          permitted = params.require(:catalog_link).permit(
            :slug, :link_type, :show_prices, :allow_order, :allow_payment, :expires_at, :parent_catalog_link_id
          ).to_h

          case permitted["link_type"]
          when "wholesale_buyer"
            permitted["show_prices"] = true if permitted["show_prices"].nil?
            permitted["allow_order"] = true if permitted["allow_order"].nil?
          when "public_client"
            permitted["show_prices"] = false
            permitted["allow_order"] = false
            permitted["allow_payment"] = false
          end

          permitted
        end

        def link_json(link)
          {
            id: link.id,
            catalog_id: link.catalog_id,
            token: link.token,
            slug: link.slug,
            link_type: link.link_type,
            show_prices: link.show_prices,
            allow_order: link.allow_order,
            allow_payment: link.allow_payment,
            expires_at: link.expires_at,
            url: "/link/#{link.token}"
          }
        end
      end
    end
  end
end
