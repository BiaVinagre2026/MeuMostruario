import { useOperatorStore } from "@/stores/useOperatorStore";

// A sessão do admin pertence ao seu tenant, nunca ao cliente padrão do host.
// Superadmins continuam com sessão global, sem depender da aba selecionada.
export function operatorSessionHeaders(): Record<string, string> {
  const { operator } = useOperatorStore.getState();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (operator?.role === "admin" && operator.tenant_slug) {
    headers["X-Tenant-ID"] = operator.tenant_slug;
  }
  return headers;
}
