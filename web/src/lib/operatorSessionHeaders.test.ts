import { operatorSessionHeaders } from "./operatorSessionHeaders";
import { useOperatorStore } from "@/stores/useOperatorStore";
import type { Operator } from "@/types/operator";

const coralAdmin: Operator = { id: 48, name: "Admin Coral", email: "admin@example.com", role: "admin", status: "active", tenant_id: 696, tenant_slug: "mare-coral" };

afterEach(() => useOperatorStore.getState().logout());

it("mantém a sessão do admin da Maré Coral no tenant correto", () => {
  useOperatorStore.setState({ operator: coralAdmin, activeTenantSlug: "demo" });
  expect(operatorSessionHeaders()).toEqual({ Accept: "application/json", "X-Tenant-ID": "mare-coral" });
});

it("mantém a sessão global independente do cliente selecionado", () => {
  useOperatorStore.setState({ operator: { ...coralAdmin, role: "super_admin", tenant_id: null, tenant_slug: null }, activeTenantSlug: "demo" });
  expect(operatorSessionHeaders()).toEqual({ Accept: "application/json" });
});
