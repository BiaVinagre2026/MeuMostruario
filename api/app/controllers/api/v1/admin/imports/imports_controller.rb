# frozen_string_literal: true

module Api
  module V1
    module Admin
      module Imports
        class ImportsController < BaseController
          NOT_IMPLEMENTED = { error: "Import feature not yet available" }.freeze

          def create  = render json: NOT_IMPLEMENTED, status: :not_implemented
          def show    = render json: NOT_IMPLEMENTED, status: :not_implemented
          def confirm = render json: NOT_IMPLEMENTED, status: :not_implemented
        end
      end
    end
  end
end
