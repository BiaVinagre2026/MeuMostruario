# frozen_string_literal: true

module Api
  module V1
    module Admin
      class TenantConfigController < BaseController

        def show
          config = current_tenant.tenant_config
          render json: { config: full_config_json(config) }
        end

        def update
          config = current_tenant.tenant_config

          ActiveRecord::Base.transaction do
            current_tenant.update!(name: params[:tenant_name]) if params[:tenant_name].present?
            config.update!(config_params)
          end

          render json: { config: full_config_json(config.reload) }
        rescue ActiveRecord::RecordInvalid => e
          render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
        end

        private

        def config_params
          params.permit(
            :logo_url, :logo_compact_url, :logo_mono_url, :favicon_url, :favicon_mode,
            :color_primary, :color_secondary, :color_accent,
            :color_header_bg,
            :color_header_text, :color_header_text_hover,
            :color_footer_text, :color_footer_text_hover,
            :font_primary, :font_heading,
            :coin_name, :coin_symbol, :coin_icon_url,
            :company_name, :company_cnpj, :company_address,
            :company_phone, :company_email, :company_website,
            :footer_text, :terms_url, :privacy_url,
            :social_instagram, :social_facebook, :social_tiktok,
            :social_youtube, :social_linkedin, :social_whatsapp,
            :social_twitter, :social_telegram,
            :overdue_days, :timezone, :locale,
            # Email config
            :email_provider,
            :smtp_host, :smtp_port, :smtp_username, :smtp_password_enc,
            :smtp_from_name, :smtp_from_email, :smtp_authentication, :smtp_enable_starttls,
            :ses_access_key_id, :ses_secret_key_enc, :ses_region,
            # Storage config
            :storage_provider, :s3_bucket, :s3_region,
            :s3_access_key_id, :s3_secret_access_key_enc, :s3_public_url,
            # AI config
            :openrouter_model
          )
        end

        def full_config_json(config)
          {
            tenant_name:        config.tenant.name,
            logo_url:           config.logo_url,
            logo_compact_url:   config.logo_compact_url,
            logo_mono_url:      config.logo_mono_url,
            favicon_url:        config.favicon_url,
            favicon_mode:       config.favicon_mode,
            color_primary:             config.color_primary,
            color_secondary:           config.color_secondary,
            color_accent:              config.color_accent,
            color_header_bg:           config.color_header_bg,
            color_header_text:         config.color_header_text,
            color_header_text_hover:   config.color_header_text_hover,
            color_footer_text:         config.color_footer_text,
            color_footer_text_hover:   config.color_footer_text_hover,
            font_primary:              config.font_primary,
            font_heading:              config.font_heading,
            coin_name:          config.coin_name,
            coin_symbol:        config.coin_symbol,
            coin_icon_url:      config.coin_icon_url,
            company_name:       config.company_name,
            company_cnpj:       config.company_cnpj,
            company_address:    config.company_address,
            company_phone:      config.company_phone,
            company_email:      config.company_email,
            company_website:    config.company_website,
            footer_text:        config.footer_text,
            terms_url:          config.terms_url,
            privacy_url:        config.privacy_url,
            social_instagram:   config.social_instagram,
            social_facebook:    config.social_facebook,
            social_tiktok:      config.social_tiktok,
            social_youtube:     config.social_youtube,
            social_linkedin:    config.social_linkedin,
            social_whatsapp:    config.social_whatsapp,
            social_twitter:     config.social_twitter,
            social_telegram:    config.social_telegram,
            overdue_days:       config.overdue_days,
            timezone:           config.timezone,
            locale:             config.locale,
            # Email config (passwords as boolean flags)
            email_provider:       config.email_provider,
            smtp_host:            config.smtp_host,
            smtp_port:            config.smtp_port,
            smtp_username:        config.smtp_username,
            smtp_from_name:       config.smtp_from_name,
            smtp_from_email:      config.smtp_from_email,
            smtp_authentication:  config.smtp_authentication,
            smtp_enable_starttls: config.smtp_enable_starttls,
            smtp_password_set:    config.smtp_password_enc.present?,
            ses_access_key_id:    config.ses_access_key_id,
            ses_secret_key_set:   config.ses_secret_key_enc.present?,
            ses_region:           config.ses_region,
            # Storage config
            storage_provider:           config.storage_provider,
            s3_bucket:                  config.s3_bucket,
            s3_region:                  config.s3_region,
            s3_access_key_id:           config.s3_access_key_id,
            s3_secret_access_key_set:   config.s3_secret_access_key_enc.present?,
            s3_public_url:              config.s3_public_url,
            # AI config
            openrouter_model:           config.openrouter_model
          }
        end
      end
    end
  end
end
