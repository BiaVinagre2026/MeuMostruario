import type { Operator } from "@/types/operator";

export const PLATFORM_NAME = "Mostruário White Label Multi Tenant";

export function resolveBrandingScope(
  pathname: string,
  operator: Pick<Operator, "role" | "tenant_slug"> | null,
  activeTenantSlug: string | null,
  storefrontSlug?: string,
) {
  const adminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const globalRoute = pathname === "/admin" || pathname === "/admin/login"
    || pathname === "/admin/global" || pathname.startsWith("/admin/global/");
  const adminSlug = operator?.role === "admin" ? operator.tenant_slug : activeTenantSlug;
  const platform = adminRoute && (globalRoute || !adminSlug);
  return {
    platform,
    tenantSlug: platform ? undefined : adminRoute ? adminSlug || undefined : storefrontSlug,
  };
}
