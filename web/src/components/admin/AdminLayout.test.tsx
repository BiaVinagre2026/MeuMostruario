import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AdminLayout } from "@/components/admin/AdminLayout";

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
    expect(screen.getByText(/Tenant ativo: demo/i)).toBeInTheDocument();
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
  });
});
