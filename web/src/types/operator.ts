export interface Operator {
  id: number;
  name: string;
  email: string;
  role: "admin" | "super_admin";
  status: "active" | "suspended";
  tenant_id: number | null;
  tenant_slug: string | null;
}

export interface OperatorLoginCredentials {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface TenantOption {
  id: number;
  slug: string;
  name: string;
  plan: string;
}

export type TenantPlan = "starter" | "growth" | "enterprise";
export type TenantStatus = "active" | "suspended" | "cancelled";

export interface AdminTenant {
  id: number;
  slug: string;
  name: string;
  plan: TenantPlan;
  status: TenantStatus;
  custom_domain: string | null;
  schema_name: string;
  created_at: string;
}

export interface AdminTenantStat extends AdminTenant {
  members_total: number;
  members_active: number;
  members_overdue: number;
  coins_circulating: number;
  redemptions_total: number;
  redemptions_month: number;
  error?: boolean;
}

export interface AdminGlobalStats {
  totals: {
    tenants_count: number;
    members: number;
    active_members: number;
    overdue_members: number;
    coins_circulating: number;
    redemptions_total: number;
    redemptions_month: number;
  };
  tenants: AdminTenantStat[];
}
