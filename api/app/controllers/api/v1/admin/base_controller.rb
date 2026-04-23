# frozen_string_literal: true

module Api
  module V1
    module Admin
      class BaseController < ApplicationController
        include OperatorAuthenticatable

        skip_before_action :require_tenant!, if: -> { !tenant_required? }

        private

        def tenant_required?
          true
        end
      end
    end
  end
end
