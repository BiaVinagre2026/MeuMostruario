module Api
  module V1
    class MembersController < ApplicationController
      before_action :require_auth!

      # GET /api/v1/profile
      def show
        render json: { member: member_json(current_member) }
      end

      # PATCH /api/v1/profile
      def update
        if current_member.update(profile_params)
          render json: { member: member_json(current_member) }
        else
          render json: { errors: current_member.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/profile/password
      def change_password
        unless current_member.authenticate(params[:current_password])
          return render json: { error: "Current password is incorrect" }, status: :unprocessable_entity
        end

        if current_member.update(password: params[:password], password_confirmation: params[:password_confirmation])
          render json: { message: "Password changed successfully" }
        else
          render json: { errors: current_member.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def profile_params
        params.permit(:full_name, :email, :phone, :gender, :birthdate)
      end

      def member_json(member)
        {
          id: member.id,
          cpf: CpfValidator.format(member.cpf),
          full_name: member.full_name,
          email: member.email,
          phone: member.phone,
          gender: member.gender,
          birthdate: member.birthdate,
          role: member.role,
          status: member.status,
          plan_status: member.plan_status,
          created_at: member.created_at
        }
      end
    end
  end
end
