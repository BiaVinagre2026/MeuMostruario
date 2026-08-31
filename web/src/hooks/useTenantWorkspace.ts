import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { useOperatorStore } from "@/stores/useOperatorStore";

function isTenantScopedAdminQuery(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === "admin" && queryKey[1] !== "global";
}

export function useTenantWorkspace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setActiveTenantSlug = useOperatorStore((state) => state.setActiveTenantSlug);

  const clearTenantWorkspace = useCallback(async () => {
    const filters = {
      predicate: (query: { queryKey: readonly unknown[] }) =>
        isTenantScopedAdminQuery(query.queryKey),
    };

    await queryClient.cancelQueries(filters);
    queryClient.removeQueries(filters);
  }, [queryClient]);

  const openTenant = useCallback(async (slug: string, destination = "/admin/dashboard") => {
    await clearTenantWorkspace();
    setActiveTenantSlug(slug);
    navigate(destination);
  }, [clearTenantWorkspace, navigate, setActiveTenantSlug]);

  const openGlobal = useCallback(async () => {
    await clearTenantWorkspace();
    setActiveTenantSlug(null);
    navigate("/admin/global");
  }, [clearTenantWorkspace, navigate, setActiveTenantSlug]);

  return { openTenant, openGlobal };
}

