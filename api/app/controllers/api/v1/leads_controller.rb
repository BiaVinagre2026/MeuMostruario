# frozen_string_literal: true

module Api
  module V1
    class LeadsController < ApplicationController
      def create
        lead = Lead.new(lead_params)
        lead.save!
        render json: { message: "Mensagem enviada com sucesso" }, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      private

      def lead_params
        permitted = params.require(:lead).permit(
          :name, :contact_name, :email, :phone, :message, :notes,
          :source, :product_id,
          :company_name, :cnpj, :state_registration,
          :zip_code, :street, :number, :complement, :neighborhood, :city, :state
        ).with_defaults(source: "storefront", status: "new")

        # Normalize: contact_name → name
        permitted[:name] = permitted.delete(:contact_name) if permitted[:name].blank? && permitted[:contact_name].present?
        permitted.delete(:contact_name)

        # Normalize: notes → message (WhatsApp order summary)
        permitted[:message] = permitted.delete(:notes) if permitted[:message].blank? && permitted[:notes].present?
        permitted.delete(:notes)

        # B2B address/company fields → metadata JSONB
        b2b_keys = %w[company_name cnpj state_registration zip_code street number complement neighborhood city state]
        metadata = b2b_keys.each_with_object({}) { |k, h| h[k] = permitted.delete(k) if permitted[k].present? }
        permitted[:metadata] = metadata unless metadata.empty?

        # Ensure source is a valid value
        permitted[:source] = "other" unless Lead::SOURCE_VALUES.include?(permitted[:source])

        permitted
      end
    end
  end
end
