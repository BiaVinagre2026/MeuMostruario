module Api
  module V1
    class TenantsController < ApplicationController
      skip_before_action :require_auth!, raise: false

      # GET /api/v1/tenant/config - public endpoint, no auth required
      def branding
        config = current_tenant.tenant_config
        render json: {
          tenant: {
            slug: current_tenant.slug,
            name: current_tenant.name,
            plan: current_tenant.plan
          },
          config: {
            logo_url: config.logo_url,
            logo_compact_url: config.logo_compact_url,
            logo_mono_url: config.logo_mono_url,
            favicon_url: config.favicon_url,
            favicon_mode: config.favicon_mode,
            color_primary: config.color_primary,
            color_secondary: config.color_secondary,
            color_accent: config.color_accent,
            color_header_bg: config.color_header_bg,
            color_header_text: config.color_header_text,
            color_header_text_hover: config.color_header_text_hover,
            color_footer_text: config.color_footer_text,
            color_footer_text_hover: config.color_footer_text_hover,
            font_primary: config.font_primary,
            font_heading: config.font_heading,
            coin_name: config.coin_name,
            coin_symbol: config.coin_symbol,
            coin_icon_url: config.coin_icon_url,
            company_name: config.company_name,
            company_cnpj: config.company_cnpj,
            company_address: config.company_address,
            company_email: config.company_email,
            company_phone: config.company_phone,
            company_website: config.company_website,
            footer_text: config.footer_text,
            terms_url: config.terms_url,
            privacy_url: config.privacy_url,
            social: {
              instagram: config.social_instagram,
              facebook: config.social_facebook,
              whatsapp: config.social_whatsapp,
              youtube: config.social_youtube,
              tiktok: config.social_tiktok,
              linkedin: config.social_linkedin,
              twitter: config.social_twitter,
              telegram: config.social_telegram
            }.compact
          }
        }
      end
    end
  end
end
