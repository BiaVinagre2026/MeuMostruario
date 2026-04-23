export interface PartnerBankAccount {
  id: number;
  bank_name: string | null;
  agency: string | null;
  account_number: string | null;
  pix_key_type: "cpf" | "cnpj" | "email" | "phone" | "random" | null;
  pix_key: string | null;
  is_primary: boolean;
  status: "active" | "inactive";
}

export interface PartnerAuthorizedTenant {
  tenant_id: number;
  tenant_name: string | null;
  status: string;
}

export interface Partner {
  id: number;
  name: string;
  legal_name: string | null;
  document_type: "cpf" | "cnpj";
  document_number: string | null;
  email: string;
  contact_name: string | null;
  phone: string | null;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  status: "pending_approval" | "active" | "inactive" | "suspended" | "rejected";
  default_commission_percent: number | null;
  api_key: string | null;
  bank_accounts?: PartnerBankAccount[];
  authorized_tenants?: PartnerAuthorizedTenant[];
  created_at: string;
  updated_at: string;
}

export interface PartnerLoginResponse {
  message: string;
  partner: Partner;
}
