import { apiClient } from "./client";

export interface AdminConfig {
  tenant_name: string;
  company_name: string | null;
  company_email: string | null;
  company_phone: string | null;
  social_whatsapp: string | null;
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
}

export async function getAdminConfig(): Promise<AdminConfig> {
  const res = await apiClient.get<{ config: AdminConfig }>("/api/v1/admin/tenant/config");
  return res.config;
}

export async function updateAdminConfig(data: Partial<AdminConfig> & Record<string, unknown>): Promise<AdminConfig> {
  const res = await apiClient.patch<{ config: AdminConfig }>("/api/v1/admin/tenant/config", data);
  return res.config;
}
