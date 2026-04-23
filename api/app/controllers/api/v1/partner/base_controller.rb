# frozen_string_literal: true

module Api
  module V1
    module Partner
      class BaseController < ApplicationController
        include PartnerAuthenticatable

        skip_before_action :require_tenant!

        private

        def tenant_required?
          false
        end
      end
    end
  end
end
