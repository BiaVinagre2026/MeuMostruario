import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCurrentOperator } from "@/hooks/useOperatorAuth";
import { useOperatorStore } from "@/stores/useOperatorStore";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useSessionValidator } from "@/hooks/useSessionValidator";

interface OperatorAuthProviderProps {
  children: ReactNode;
}

export default function OperatorAuthProvider({ children }: OperatorAuthProviderProps) {
  const setOperator = useOperatorStore((s) => s.setOperator);
  const setLoading = useOperatorStore((s) => s.setLoading);
  const logout = useOperatorStore((s) => s.logout);
  const isAuthenticated = useOperatorStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();

  const { data, isSuccess, isError, isPending } = useCurrentOperator();

  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!initialLoadDone.current) {
      setLoading(isPending);
    }
  }, [isPending, setLoading]);

  useEffect(() => {
    if (isSuccess && data) {
      setOperator(data);
      initialLoadDone.current = true;
    }
  }, [isSuccess, data, setOperator]);

  useEffect(() => {
    if (isError) {
      setOperator(null);
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, [isError, setOperator, setLoading]);

  const handleInactivityExpire = useCallback(() => {
    logout();
    queryClient.clear();
    toast.info("Admin session expired due to inactivity.");
    fetch("/api/v1/admin/auth/logout", {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json" },
    }).catch(() => {});
  }, [logout, queryClient]);

  useInactivityLogout(isAuthenticated, handleInactivityExpire);

  const handleSessionInvalid = useCallback(() => {
    logout();
    queryClient.clear();
    toast.warning("Admin session expired. Please log in again.");
    fetch("/api/v1/admin/auth/logout", {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json" },
    }).catch(() => {});
  }, [logout, queryClient]);

  useSessionValidator({
    isAuthenticated,
    validateFn: () =>
      fetch("/api/v1/admin/auth/me", {
        credentials: "include",
        headers: { Accept: "application/json" },
      }).then((res) => {
        if (!res.ok) throw { status: res.status };
        return res.json();
      }),
    onInvalid: handleSessionInvalid,
    storageKey: "app_operator_session_logout",
  });

  return <>{children}</>;
}
