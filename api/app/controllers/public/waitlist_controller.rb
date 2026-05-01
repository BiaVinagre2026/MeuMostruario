# frozen_string_literal: true

module Public
  class WaitlistController < BaseController
    def create
      entry = Waitlist.new(waitlist_params)
      if entry.save
        redirect_back_or_to root_path, notice: "Você está na lista! Avisaremos quando disponível."
      else
        redirect_back_or_to root_path, alert: "Não foi possível registrar seu e-mail."
      end
    end

    private

    def waitlist_params
      params.require(:waitlist).permit(:email, :phone, :name, :collection_id, :product_id)
    end
  end
end
