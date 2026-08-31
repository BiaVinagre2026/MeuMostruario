import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Globe2, Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { apiClient } from "@/lib/api/client";
import { useOperatorStore } from "@/stores/useOperatorStore";
import { useTenantWorkspace } from "@/hooks/useTenantWorkspace";
import type { AdminTenant } from "@/types/operator";

interface TenantListResponse {
  tenants: AdminTenant[];
}

function tabClass(active: boolean): string {
  return [
    "inline-flex h-9 flex-shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-3 text-xs font-medium transition-colors",
    active
      ? "border-border bg-background text-foreground shadow-sm"
      : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground",
  ].join(" ");
}

export function TenantWorkspaceTabs() {
  const operator = useOperatorStore((state) => state.operator);
  const activeTenantSlug = useOperatorStore((state) => state.activeTenantSlug);
  const isSuperAdmin = operator?.role === "super_admin";
  const { openGlobal, openTenant } = useTenantWorkspace();

  const { data, isLoading, isError } = useQuery<TenantListResponse>({
    queryKey: ["admin", "global", "tenants"],
    queryFn: () => apiClient.get<TenantListResponse>("/api/v1/admin/tenants"),
    enabled: isSuperAdmin,
  });

  const activeTenants = useMemo(
    () => (data?.tenants ?? [])
      .filter((tenant) => tenant.status === "active")
      .sort((left, right) => left.name.localeCompare(right.name)),
    [data],
  );

  if (!isSuperAdmin) return null;

  return (
    <div className="border-b bg-muted/30" aria-label="Trocar cliente ativo">
      <div className="flex min-h-11 items-end gap-1 overflow-x-auto px-3 pt-2 md:px-5">
        <span className="mb-2 mr-1 hidden flex-shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:inline-flex">
          <Building2 className="h-3.5 w-3.5" /> Clientes
        </span>

        <button
          type="button"
          className={tabClass(!activeTenantSlug)}
          aria-current={!activeTenantSlug ? "page" : undefined}
          onClick={() => void openGlobal()}
        >
          <Globe2 className="h-3.5 w-3.5" />
          Visão global
        </button>

        {isLoading && (
          <span className="mb-2 px-3 text-xs text-muted-foreground">Carregando clientes...</span>
        )}

        {!isLoading && activeTenants.map((tenant) => {
          const active = activeTenantSlug === tenant.slug;
          return (
            <button
              key={tenant.id}
              type="button"
              className={tabClass(active)}
              aria-current={active ? "page" : undefined}
              title={`${tenant.name} · plano ${tenant.plan}`}
              onClick={() => void openTenant(tenant.slug)}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              {tenant.name}
            </button>
          );
        })}

        {isError && (
          <span className="mb-2 px-3 text-xs text-destructive">Clientes indisponíveis</span>
        )}

        <Link
          to="/admin/global/tenants"
          className="mb-1.5 ml-1 inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Gerenciar
        </Link>
      </div>
    </div>
  );
}

