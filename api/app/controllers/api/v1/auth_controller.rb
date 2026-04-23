module Api
  module V1
    class AuthController < ApplicationController
      before_action :require_auth!, only: [:logout, :me]

      # POST /api/v1/auth/login
      def login
        cpf = CpfValidator.clean(params[:cpf])

        unless CpfValidator.valid?(cpf)
          return render json: { error: "Invalid CPF" }, status: :unprocessable_entity
        end

        member = Member.active.find_by(cpf: cpf)

        unless member&.authenticate(params[:password])
          return render json: { error: "Invalid credentials" }, status: :unauthorized
        end

        token_payload = {
          "member_id" => member.id,
          "tenant_slug" => current_tenant.slug
        }

        if mobile_client?
          token = JwtService.encode_mobile_access(token_payload)
        else
          token = JwtService.encode(token_payload)
        end

        cookies.signed[:app_token] = {
          value: token,
          httponly: true,
          same_site: :lax,
          expires: 7.days.from_now,
          secure: Rails.env.production?
        }

        response_body = { member: member_json(member) }

        if mobile_client?
          response_body[:token] = token
          response_body[:refresh_token] = JwtService.encode_refresh(token_payload)
        end

        render json: response_body, status: :ok
      end

      # DELETE /api/v1/auth/logout
      def logout
        cookies.delete(:app_token)
        render json: { message: "Logged out successfully" }, status: :ok
      end

      # GET /api/v1/auth/me
      def me
        render json: { member: member_json(current_member) }, status: :ok
      end

      # POST /api/v1/auth/refresh
      def refresh
        refresh_token = params[:refresh_token]
        return render json: { error: "refresh_token is required" }, status: :bad_request unless refresh_token.present?

        payload = JwtService.decode_refresh(refresh_token)

        unless payload["tenant_slug"] == current_tenant.slug
          return render json: { error: "Token does not match tenant" }, status: :unauthorized
        end

        member = Member.active.find_by(id: payload["member_id"])
        return render json: { error: "Member not found or inactive" }, status: :unauthorized unless member

        token_payload = {
          "member_id"   => member.id,
          "tenant_slug" => current_tenant.slug
        }

        render json: {
          token:         JwtService.encode_mobile_access(token_payload),
          refresh_token: JwtService.encode_refresh(token_payload)
        }, status: :ok
      rescue JwtService::TokenExpiredError
        render json: { error: "Refresh token has expired" }, status: :unauthorized
      rescue JwtService::InvalidTokenError => e
        render json: { error: e.message }, status: :unauthorized
      end

      # POST /api/v1/auth/request_password_reset
      def request_password_reset
        cpf = CpfValidator.clean(params[:cpf])

        if CpfValidator.valid?(cpf)
          member = Member.find_by(cpf: cpf)
          if member&.active?
            token = SecureRandom.hex(32)
            member.update_columns(
              reset_password_token:    token,
              reset_password_sent_at:  Time.current
            )
            EmailDispatcher.dispatch(current_tenant, MemberMailer, :first_access, member.id, token)
          end
        end

        render json: { message: "If the CPF is registered, you will receive an email." }, status: :ok
      end

      # POST /api/v1/auth/reset_password
      def reset_password
        member = Member.find_by(reset_password_token: params[:token])

        if member.nil? || member.reset_password_sent_at.nil? || member.reset_password_sent_at < 24.hours.ago
          return render json: { error: "Invalid or expired link." }, status: :unprocessable_entity
        end

        unless member.update(
          password:                  params[:password],
          password_confirmation:     params[:password_confirmation],
          reset_password_token:      nil,
          reset_password_sent_at:    nil
        )
          return render json: { errors: member.errors.full_messages }, status: :unprocessable_entity
        end

        token_payload = {
          "member_id"   => member.id,
          "tenant_slug" => current_tenant.slug
        }

        if mobile_client?
          token = JwtService.encode_mobile_access(token_payload)
        else
          token = JwtService.encode(token_payload)
        end

        cookies.signed[:app_token] = {
          value:     token,
          httponly:  true,
          same_site: :lax,
          expires:   7.days.from_now,
          secure:    Rails.env.production?
        }

        response_body = { member: member_json(member) }

        if mobile_client?
          response_body[:token] = token
          response_body[:refresh_token] = JwtService.encode_refresh(token_payload)
        end

        render json: response_body, status: :ok
      end

      private

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
