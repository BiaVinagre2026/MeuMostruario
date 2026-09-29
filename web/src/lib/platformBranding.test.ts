import { PLATFORM_NAME, resolveBrandingScope } from "./platformBranding";

const superAdmin = { role: "super_admin" as const, tenant_slug: null };
const coralAdmin = { role: "admin" as const, tenant_slug: "mare-coral" };

describe("identidade da plataforma e dos clientes", () => {
  it("usa o nome aprovado", () => {
    expect(PLATFORM_NAME).toBe("Mostruário White Label Multi Tenant");
  });
  it.each(["/admin", "/admin/login", "/admin/global", "/admin/global/tenants"])("não herda BEFIT em %s", (path) => {
    expect(resolveBrandingScope(path, superAdmin, "demo", "demo")).toEqual({ platform: true, tenantSlug: undefined });
  });
  it("usa somente o tenant escolhido pelo superadmin", () => {
    expect(resolveBrandingScope("/admin/settings", superAdmin, "mare-coral", "demo")).toEqual({ platform: false, tenantSlug: "mare-coral" });
  });
  it("fixa o admin comum ao tenant da conta", () => {
    expect(resolveBrandingScope("/admin/products", coralAdmin, "demo", "demo")).toEqual({ platform: false, tenantSlug: "mare-coral" });
  });
  it("não muda a identidade da loja pública por causa da sessão do superadmin", () => {
    expect(resolveBrandingScope("/catalog", superAdmin, "mare-coral", "demo")).toEqual({ platform: false, tenantSlug: "demo" });
  });
});
