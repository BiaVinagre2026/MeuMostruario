import { apiClient } from "./client";

export interface AdminConfig {
  tenant_name: string;
  // Marca
  logo_url: string | null;
  logo_compact_url: string | null;
  favicon_url: string | null;
  favicon_mode: string | null;
  // Cores
  color_primary: string | null;
  color_secondary: string | null;
  color_accent: string | null;
  color_header_bg: string | null;
  color_header_text: string | null;
  color_header_text_hover: string | null;
  color_footer_text: string | null;
  color_footer_text_hover: string | null;
  // Tipografia
  font_primary: string | null;
  font_heading: string | null;
  // Empresa
  company_name: string | null;
  company_cnpj: string | null;
  company_address: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_website: string | null;
  // Textos publicos
  footer_text: string | null;
  announcement_bar_text: string | null;
  terms_url: string | null;
  privacy_url: string | null;
  // Redes sociais
  social_instagram: string | null;
  social_facebook: string | null;
  social_whatsapp: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;
  social_linkedin: string | null;
  social_twitter: string | null;
  social_telegram: string | null;
  // Email
  email_provider: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_username: string | null;
  smtp_from_name: string | null;
  smtp_from_email: string | null;
  smtp_authentication: string | null;
  smtp_enable_starttls: boolean | null;
  smtp_password_set: boolean;
  ses_access_key_id: string | null;
  ses_region: string | null;
  ses_secret_key_set: boolean;
  // Gateway de pagamento (Orbe PSP)
  psp_api_url: string | null;
  psp_merchant_id: string | null;
  psp_api_key_set: boolean;
  psp_callback_secret_set: boolean;
  psp_signature_header: string | null;
  psp_configured: boolean;
  /** Pedido mínimo do atacado. Zero significa sem mínimo. */
  min_order_amount: number | string | null;
}

export async function getAdminConfig(): Promise<AdminConfig> {
  const res = await apiClient.get<{ config: AdminConfig }>("/api/v1/admin/tenant/config");
  return res.config;
}

export async function updateAdminConfig(data: Partial<AdminConfig> & Record<string, unknown>): Promise<AdminConfig> {
  const res = await apiClient.patch<{ config: AdminConfig }>("/api/v1/admin/tenant/config", data);
  return res.config;
}
