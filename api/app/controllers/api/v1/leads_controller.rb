# frozen_string_literal: true

module Api
  module V1
    class LeadsController < ApplicationController
      def create
        lead = Lead.new(lead_params)
        lead.save!
        render json: { message: "Mensagem enviada com sucesso" }, status: :created
      end

      private

      def lead_params
        params.require(:lead).permit(:name, :email, :phone, :message, :source, :product_id)
              .with_defaults(source: "storefront", status: "new")
      end
    end
  end
end
