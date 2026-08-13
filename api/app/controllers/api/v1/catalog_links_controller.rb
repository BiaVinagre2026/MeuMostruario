# frozen_string_literal: true

module Api
  module V1
    class CatalogLinksController < ApplicationController
      before_action :set_catalog_link

      def show
        render json: { catalog_link: catalog_link_json(@catalog_link) }
      end

      def interests
        selection = create_selection!(status: "sent")
        Lead.create!(
          name: params[:name],
          email: params[:email],
          phone: params[:phone],
          message: params[:message].presence || "Interesse registrado pelo link #{@catalog_link.token}",
          source: "storefront",
          metadata: {
            "catalog_link_id" => @catalog_link.id,
            "selection_id" => selection.id,
            "items" => selection.selection_items.map { |item| selection_item_snapshot(item) }
          }
        )

        render json: { message: "Interesse registrado", selection: selection_json(selection) }, status: :created
      end

      def selections
        selection = create_selection!(status: "new")
        generated_link = create_selection_link!(selection)
        selection.update!(generated_catalog_link: generated_link)

        render json: {
          selection: selection_json(selection),
          catalog_link: link_summary_json(generated_link)
        }, status: :created
      end

      def orders
        unless @catalog_link.allow_order?
          return render json: { errors: ["este link nao permite pedido"] }, status: :unprocessable_entity
        end

        items = normalized_order_items
        return render json: { errors: ["items nao pode estar vazio"] }, status: :unprocessable_entity if items.empty?

        if (document_error = buyer_document_error)
          return render json: { errors: [document_error] }, status: :unprocessable_entity
        end

        order = OrderBuilderService.build(
          catalog_link: @catalog_link,
          buyer: buyer_params.to_h,
          items: items,
          notes: params.dig(:order, :notes),
          subtotal: params.dig(:order, :subtotal),
          discount: params.dig(:order, :discount),
          discount_pct: params.dig(:order, :discount_pct),
          total: params.dig(:order, :total)
        )

        payment = if @catalog_link.allow_payment?
          GatewayPaymentService.new(config: current_tenant&.tenant_config).create_intent!(
            order: order,
            payment_method: params.dig(:order, :payment_method).presence || "pix"
          )
        end

        render json: {
          order: order_json(order.reload),
          payment: payment && payment_json(payment)
        }, status: :created
      end

      private

      def set_catalog_link
        @catalog_link = CatalogLink.active.includes(catalog: { catalog_items: [:product, :photo] }).find_by!(token: params[:token])
        render json: { error: "Link expirado" }, status: :gone if @catalog_link.expired?
      end

      def selected_catalog_items
        ids = Array(params[:catalog_item_ids] || params.dig(:selection, :catalog_item_ids)).map(&:to_i).reject(&:zero?)
        return @catalog_link.catalog.catalog_items.where(visible: true) if ids.empty?
        @catalog_link.catalog.catalog_items.where(id: ids, visible: true)
      end

      def create_selection!(status:)
        Selection.create!(
          catalog_link: @catalog_link,
          contact_name: params[:name] || params.dig(:selection, :contact_name),
          contact_phone: params[:phone] || params.dig(:selection, :contact_phone),
          contact_email: params[:email] || params.dig(:selection, :contact_email),
          status: status,
          metadata: params[:metadata] || {}
        ).tap do |selection|
          selected_catalog_items.each do |item|
            selection.selection_items.create!(
              catalog_item: item,
              product: item.product,
              photo: item.photo,
              qty: 1,
              metadata: item_snapshot(item)
            )
          end
        end
      end

      def create_selection_link!(selection)
        catalog = Catalog.create!(
          name: "Selecao #{selection.id}",
          description: "Link derivado de #{@catalog_link.catalog.name}",
          status: "published",
          source: "selection",
          metadata: { "source_catalog_link_id" => @catalog_link.id }
        )

        selection.selection_items.each_with_index do |selection_item, index|
          catalog.catalog_items.create!(
            product: selection_item.product,
            photo: selection_item.photo,
            position: index,
            visible: true,
            metadata: selection_item.metadata
          )
        end

        catalog.catalog_links.create!(
          parent_catalog_link: @catalog_link,
          link_type: "selection",
          show_prices: false,
          allow_order: false,
          allow_payment: false
        )
      end

      # O gateway exige customer_document na cobranca, entao o documento e
      # obrigatorio quando o link cobra. Sem pagamento o pedido segue sem ele,
      # mas se vier preenchido precisa ser um CPF ou CNPJ de verdade.
      def buyer_document_error
        document = params.dig(:order, :buyer_document)

        if document.blank?
          return "informe o CPF ou CNPJ do comprador" if @catalog_link.allow_payment?
          return nil
        end

        "CPF ou CNPJ invalido" unless DocumentValidator.valid?(document)
      end

      def buyer_params
        params.require(:order).permit(:buyer_name, :buyer_phone, :buyer_email, :buyer_document).transform_keys do |key|
          key.to_s.sub("buyer_", "")
        end
      end

      def normalized_order_items
        Array(params.dig(:order, :items)).map do |raw|
          item = raw.respond_to?(:to_unsafe_h) ? raw.to_unsafe_h.with_indifferent_access : raw.to_h.with_indifferent_access
          catalog_item = CatalogItem.find_by(id: item[:catalog_item_id])
          product = catalog_item&.product || Product.find_by(id: item[:product_id])
          photo = catalog_item&.photo || Photo.find_by(id: item[:photo_id])

          item.merge(
            product_id: product&.id,
            product_name: item[:product_name].presence || product&.name || photo&.approved_model || "Foto #{photo&.id}",
            product_sku: item[:product_sku].presence || product&.sku,
            price: item[:price].presence || product&.price_wholesale || 0,
            unit_price: item[:unit_price].presence || product&.price_wholesale || 0,
            color: item[:color].presence || photo&.approved_color,
            pantone: item[:pantone].presence || photo&.approved_pantone,
            image_url: item[:image_url].presence || photo&.display_url || product&.cover_image&.original_url,
            photo_id: photo&.id,
            catalog_item_id: catalog_item&.id
          )
        end
      end

      def catalog_link_json(link)
        {
          id: link.id,
          token: link.token,
          slug: link.slug,
          link_type: link.link_type,
          show_prices: link.show_prices,
          allow_order: link.allow_order,
          allow_payment: link.allow_payment,
          catalog: {
            id: link.catalog.id,
            name: link.catalog.name,
            description: link.catalog.description
          },
          items: link.catalog.catalog_items.select(&:visible).map { |item| catalog_item_json(item, link) }
        }
      end

      def catalog_item_json(item, link)
        product = item.product
        photo = item.photo
        {
          id: item.id,
          product_id: product&.id,
          photo_id: photo&.id,
          name: product&.name || photo&.approved_model || photo&.suggested_model || "Foto #{photo&.id}",
          sku: product&.sku,
          description: product&.description,
          image_url: photo&.display_url || product&.cover_image&.original_url,
          thumb_url: photo&.thumb_url || product&.cover_image&.thumb_url,
          color: photo&.approved_color || photo&.suggested_color,
          pantone: photo&.approved_pantone || photo&.suggested_pantone,
          model: photo&.approved_model || photo&.suggested_model,
          size_group: photo&.approved_size_group || photo&.suggested_size_group,
          sizes: size_groups_for(product, photo),
          price: link.show_prices ? product&.price_wholesale.to_d : nil,
          price_retail: link.show_prices ? product&.price_retail.to_d : nil
        }
      end

      def size_groups_for(product, photo)
        groups = product&.variants&.map(&:size_group)&.compact || []
        groups << photo.approved_size_group if photo&.approved_size_group.present?
        groups.uniq.presence || Photo::SIZE_GROUPS
      end

      def item_snapshot(item)
        {
          "catalog_item_id" => item.id,
          "product_id" => item.product_id,
          "photo_id" => item.photo_id,
          "name" => item.product&.name || item.photo&.approved_model,
          "image_url" => item.photo&.display_url,
          "color" => item.photo&.approved_color,
          "pantone" => item.photo&.approved_pantone
        }.compact
      end

      def selection_item_snapshot(item)
        item.metadata || item_snapshot(item.catalog_item)
      end

      def selection_json(selection)
        {
          id: selection.id,
          status: selection.status,
          contact_name: selection.contact_name,
          contact_phone: selection.contact_phone,
          items: selection.selection_items.map { |item| selection_item_snapshot(item) },
          created_at: selection.created_at
        }
      end

      def link_summary_json(link)
        {
          id: link.id,
          token: link.token,
          link_type: link.link_type,
          show_prices: link.show_prices,
          allow_order: link.allow_order,
          allow_payment: link.allow_payment,
          url: "/link/#{link.token}"
        }
      end

      def order_json(order)
        {
          id: order.id,
          status: order.status,
          payment_status: order.payment_status,
          total_units: order.total_units,
          total_value: order.total_value,
          buyer_name: order.buyer_name,
          buyer_phone: order.buyer_phone,
          items: order.order_items.map do |item|
            {
              product_id: item.product_id,
              product_name: item.product_name,
              color: item.color,
              size: item.size,
              qty: item.qty,
              unit_price: item.unit_price,
              subtotal: item.subtotal,
              metadata: item.metadata
            }
          end
        }
      end

      def payment_json(payment)
        {
          id: payment.id,
          status: payment.status,
          payment_method: payment.payment_method,
          amount: payment.amount,
          checkout_url: payment.checkout_url,
          pix_qr_code: payment.pix_qr_code,
          gateway_reference: payment.gateway_reference
        }
      end
    end
  end
end
