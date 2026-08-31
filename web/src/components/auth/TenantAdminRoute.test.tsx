import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import TenantAdminRoute from "@/components/auth/TenantAdminRoute";

let storeState = {
  operator: { role: "super_admin" as "admin" | "super_admin" },
  activeTenantSlug: null as string | null,
};

vi.mock("@/stores/useOperatorStore", () => ({
  useOperatorStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={["/admin/products"]}>
      <Routes>
        <Route path="/admin/global" element={<div>Visão global</div>} />
        <Route element={<TenantAdminRoute />}>
          <Route path="/admin/products" element={<div>Produtos do cliente</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("TenantAdminRoute", () => {
  it("requires a selected client for super-admin tenant routes", () => {
    storeState = { operator: { role: "super_admin" }, activeTenantSlug: null };
    renderRoute();
    expect(screen.getByText("Visão global")).toBeInTheDocument();
  });

  it("opens tenant routes after the super-admin selects a client", () => {
    storeState = { operator: { role: "super_admin" }, activeTenantSlug: "mare-coral" };
    renderRoute();
    expect(screen.getByText("Produtos do cliente")).toBeInTheDocument();
  });

  it("keeps tenant admins in their own operation", () => {
    storeState = { operator: { role: "admin" }, activeTenantSlug: "demo" };
    renderRoute();
    expect(screen.getByText("Produtos do cliente")).toBeInTheDocument();
  });
});

