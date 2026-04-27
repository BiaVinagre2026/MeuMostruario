# frozen_string_literal: true

module Api
  module V1
    class WaitlistsController < ApplicationController
      def create
        waitlist = Waitlist.new(waitlist_params)
        waitlist.save!
        render json: { message: "Cadastrado na lista de espera" }, status: :created
      rescue ActiveRecord::RecordInvalid => e
        if e.record.errors.of_kind?(:email, :taken)
          render json: { message: "E-mail já cadastrado nessa lista" }, status: :ok
        else
          render json: { error: e.record.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def waitlist_params
        params.require(:waitlist).permit(:email, :phone, :name, :product_id, :collection_id)
      end
    end
  end
end
