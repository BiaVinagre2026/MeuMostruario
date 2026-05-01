# frozen_string_literal: true

module Public
  class SessionsController < BaseController
    def new
      redirect_to lojistas_path if member_logged_in?
    end

    def create
      email    = params[:email].to_s.strip.downcase
      password = params[:password].to_s

      result = ActiveRecord::Base.connection.exec_query(
        "SELECT id, full_name, password_digest FROM members " \
        "WHERE lower(email) = $1 AND status = 'active' LIMIT 1",
        "SQL", [email]
      )
      row = result.first

      if row && BCrypt::Password.new(row["password_digest"]).is_password?(password)
        session[:member_id]   = row["id"]
        session[:member_name] = row["full_name"]
        redirect_to session.delete(:return_to).presence || lojistas_path
      else
        flash.now[:alert] = "E-mail ou senha incorretos."
        render :new, status: :unprocessable_entity
      end
    end

    def destroy
      session.delete(:member_id)
      session.delete(:member_name)
      redirect_to root_path, notice: "Você saiu da sua conta."
    end
  end
end
