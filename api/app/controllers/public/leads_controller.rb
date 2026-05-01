# frozen_string_literal: true

module Public
  class LeadsController < BaseController
    def create
      lead = Lead.new(lead_params)
      if lead.save
        redirect_back_or_to root_path, notice: "Interesse registrado! Entraremos em contato."
      else
        redirect_back_or_to root_path, alert: "Não foi possível registrar. Tente novamente."
      end
    end

    private

    def lead_params
      params.require(:lead).permit(:name, :email, :phone, :message, :product_id)
            .merge(source: "storefront")
    end
  end
end
