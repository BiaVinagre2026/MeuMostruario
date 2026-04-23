import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCurrentUser } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/useAuthStore";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useSessionValidator } from "@/hooks/useSessionValidator";
import { apiClient } from "@/lib/api/client";

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();

  const { data, isSuccess, isError, isPending } = useCurrentUser();

  // Track whether the initial auth hydration has completed. After the first
  // successful or failed fetch, we never set isLoading=true again — this
  // prevents ProtectedRoute from unmounting children (and destroying their
  // local state) during background refetches caused by query invalidation.
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!initialLoadDone.current) {
      setLoading(isPending);
    }
  }, [isPending, setLoading]);

  useEffect(() => {
    if (isSuccess && data?.user) {
      setUser(data.user);
      initialLoadDone.current = true;
    }
  }, [isSuccess, data, setUser]);

  useEffect(() => {
    if (isError) {
      setUser(null);
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, [isError, setUser, setLoading]);

  const handleInactivityExpire = useCallback(() => {
    logout();
    queryClient.clear();
    toast.info("Session expired due to inactivity.");
    apiClient.del("/api/v1/auth/logout").catch(() => {});
  }, [logout, queryClient]);

  useInactivityLogout(isAuthenticated, handleInactivityExpire);

  // Periodic server-side session validation — catches cookie/JWT expiry,
  // account suspension, etc. Also syncs logout across browser tabs.
  const handleSessionInvalid = useCallback(() => {
    logout();
    queryClient.clear();
    toast.warning("Your session has expired. Please log in again.");
    apiClient.del("/api/v1/auth/logout").catch(() => {});
  }, [logout, queryClient]);

  useSessionValidator({
    isAuthenticated,
    validateFn: () => apiClient.get("/api/v1/auth/me"),
    onInvalid: handleSessionInvalid,
    storageKey: "app_member_session_logout",
  });

  return <>{children}</>;
}
