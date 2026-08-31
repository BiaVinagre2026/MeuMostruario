import { Navigate, Outlet } from "react-router-dom";

import { useOperatorStore } from "@/stores/useOperatorStore";

export default function TenantAdminRoute() {
  const operator = useOperatorStore((state) => state.operator);
  const activeTenantSlug = useOperatorStore((state) => state.activeTenantSlug);

  if (operator?.role === "super_admin" && !activeTenantSlug) {
    return <Navigate to="/admin/global" replace />;
  }

  return <Outlet />;
}

