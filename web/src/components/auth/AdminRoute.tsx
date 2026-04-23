import { Loader2 } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";

import { useOperatorStore } from "@/stores/useOperatorStore";

export default function AdminRoute() {
  const isAuthenticated = useOperatorStore((s) => s.isAuthenticated);
  const isLoading = useOperatorStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
