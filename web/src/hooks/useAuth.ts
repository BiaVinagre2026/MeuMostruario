import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { apiClient, ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/useAuthStore";
import type { AuthResponse, LoginCredentials, RailsAuthResponse } from "@/types/auth";

export const authKeys = {
  me: ["auth", "me"] as const,
};

function normalizeAuthResponse(raw: RailsAuthResponse): AuthResponse {
  return { user: raw.member };
}

export function useCurrentUser() {
  return useQuery<AuthResponse, ApiError>({
    queryKey: authKeys.me,
    queryFn: () =>
      apiClient
        .get<RailsAuthResponse>("/api/v1/auth/me")
        .then(normalizeAuthResponse),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  return useMutation<AuthResponse, ApiError, LoginCredentials>({
    mutationFn: (credentials) =>
      apiClient
        .post<RailsAuthResponse>("/api/v1/auth/login", credentials)
        .then(normalizeAuthResponse),

    onMutate: () => {
      setLoading(true);
    },

    onSuccess: (data) => {
      setUser(data.user);
      setLoading(false);
      toast.success(`Welcome, ${data.user.full_name.split(" ")[0]}!`);
    },

    onError: (error) => {
      setLoading(false);
      toast.error(error.message ?? "Login failed. Please try again.");
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const clearAndRedirect = () => {
    logout();
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  return useMutation<void, ApiError, void>({
    mutationFn: () => apiClient.del<void>("/api/v1/auth/logout"),

    onSuccess: () => {
      clearAndRedirect();
    },

    onError: () => {
      clearAndRedirect();
    },
  });
}
