import { resolveTenantSlugFromHost } from "./tenantContext";

describe("resolveTenantSlugFromHost", () => {
  it("extrai o tenant do subdominio", () => {
    expect(resolveTenantSlugFromHost("demo.app.local")).toBe("demo");
    expect(resolveTenantSlugFromHost("acme.meumostruario.com.br")).toBe("acme");
  });

  it("ignora endereco IP — foi o que quebrou o acesso pelo celular", () => {
    expect(resolveTenantSlugFromHost("192.168.0.233")).toBeUndefined();
    expect(resolveTenantSlugFromHost("10.0.0.1")).toBeUndefined();
    expect(resolveTenantSlugFromHost("172.19.208.1")).toBeUndefined();
  });

  it("ignora IPv6 e localhost", () => {
    expect(resolveTenantSlugFromHost("localhost")).toBeUndefined();
    expect(resolveTenantSlugFromHost("[::1]")).toBeUndefined();
    expect(resolveTenantSlugFromHost("::1")).toBeUndefined();
  });

  it("ignora subdominios reservados", () => {
    expect(resolveTenantSlugFromHost("www.meumostruario.com.br")).toBeUndefined();
    expect(resolveTenantSlugFromHost("api.meumostruario.com.br")).toBeUndefined();
    expect(resolveTenantSlugFromHost("admin.meumostruario.com.br")).toBeUndefined();
    expect(resolveTenantSlugFromHost("app.meumostruario.com.br")).toBeUndefined();
  });

  it("ignora host sem ponto e host vazio", () => {
    expect(resolveTenantSlugFromHost("meumostruario")).toBeUndefined();
    expect(resolveTenantSlugFromHost("")).toBeUndefined();
  });
});
