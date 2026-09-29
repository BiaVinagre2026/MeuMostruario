import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminStorefrontUrl } from "@/lib/adminStorefrontUrl";

const logoutMutate = vi.fn();
let storeState = {
  operator: { name: "Maria Operadora", role: "admin" as "admin" | "super_admin" },
  activeTenantSlug: "demo",
};

vi.mock("@/stores/useOperatorStore", () => ({
  useOperatorStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

vi.mock("@/hooks/useOperatorAuth", () => ({
  useOperatorLogout: () => ({ mutate: logoutMutate }),
}));

vi.mock("@/components/admin/TenantWorkspaceTabs", () => ({
  TenantWorkspaceTabs: () => <div>Abas de clientes</div>,
}));

describe("AdminLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows tenant navigation for tenant admins", () => {
    storeState = {
      operator: { name: "Maria Operadora", role: "admin" },
      activeTenantSlug: "demo",
    };

    render(
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <AdminLayout>
          <div>Conteúdo</div>
        </AdminLayout>
      </MemoryRouter>
    );

    expect(screen.getByText("Fotos")).toBeInTheDocument();
    expect(screen.getByText("Catálogos")).toBeInTheDocument();
    expect(screen.queryByText("Vitrine da loja")).not.toBeInTheDocument();
    expect(screen.getByText(/Cliente ativo: demo/i)).toBeInTheDocument();
    expect(screen.queryByText("Painel global")).not.toBeInTheDocument();
  });

  it("shows global navigation for super-admins", () => {
    storeState = {
      operator: { name: "Root Admin", role: "super_admin" },
      activeTenantSlug: null,
    };

    render(
      <MemoryRouter initialEntries={["/admin/global"]}>
        <AdminLayout>
          <div>Conteúdo</div>
        </AdminLayout>
      </MemoryRouter>
    );

    expect(screen.getByText("Painel global")).toBeInTheDocument();
    expect(screen.getByText("Tenants")).toBeInTheDocument();
    expect(screen.queryByText("Fotos")).not.toBeInTheDocument();
    expect(screen.getByText(/Painel global white-label/i)).toBeInTheDocument();
    expect(screen.getByText("Abas de clientes")).toBeInTheDocument();
    expect(screen.getAllByText("Mostruário White Label Multi Tenant").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ver vitrine")).not.toBeInTheDocument();
  });

  it("shows tenant navigation when a super-admin opens a client tab", () => {
    storeState = {
      operator: { name: "Root Admin", role: "super_admin" },
      activeTenantSlug: "mare-coral",
    };

    render(
      <MemoryRouter initialEntries={["/admin/products"]}>
        <AdminLayout>
          <div>Conteúdo</div>
        </AdminLayout>
      </MemoryRouter>
    );

    expect(screen.getByText("Painel global")).toBeInTheDocument();
    expect(screen.getByText("Produtos")).toBeInTheDocument();
    expect(screen.getByText("Vitrine da loja")).toBeInTheDocument();
    expect(screen.getByText(/Cliente ativo: mare-coral/i)).toBeInTheDocument();
  });
});

describe("adminStorefrontUrl", () => {
  it("abre a loja local da Mare Coral no mesmo host do painel", () => {
    expect(adminStorefrontUrl(
      "https://marecoral.com.br",
      "mare-coral",
      { protocol: "http:", hostname: "192.168.0.233" },
      true,
      "4311"
    )).toBe("http://192.168.0.233:4311/");
  });

  it("mantem o site configurado para outros tenants e para producao", () => {
    expect(adminStorefrontUrl(
      "https://loja.exemplo.com.br",
      "outro-tenant",
      { protocol: "http:", hostname: "localhost" },
      true
    )).toBe("https://loja.exemplo.com.br");
    expect(adminStorefrontUrl(
      "https://marecoral.com.br",
      "mare-coral",
      { protocol: "https:", hostname: "admin.exemplo.com.br" },
      false
    )).toBe("https://marecoral.com.br");
  });
});
