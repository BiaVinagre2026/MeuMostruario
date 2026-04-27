import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useOperatorStore } from "@/stores/useOperatorStore";
import type { Operator, OperatorLoginCredentials } from "@/types/operator";

export const operatorAuthKeys = {
  me: ["operator", "auth", "me"] as const,
};

async function fetchCurrentOperator(): Promise<Operator> {
  const response = await fetch("/api/v1/admin/auth/me", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Unauthorized: ${response.status}`);
  }

  const data = (await response.json()) as { operator: Operator };
  return data.operator;
}

async function postOperatorLogin(credentials: OperatorLoginCredentials): Promise<Operator> {
  const { tenantSlug, ...body } = credentials;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (tenantSlug) headers["X-Tenant-ID"] = tenantSlug;

  const response = await fetch("/api/v1/admin/auth/login", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = "Invalid credentials. Please try again.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // keep default
    }
    throw new Error(message);
  }

  const data = (await response.json()) as { operator: Operator };
  return data.operator;
}

async function deleteOperatorSession(): Promise<void> {
  await fetch("/api/v1/admin/auth/logout", {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
}

export function useCurrentOperator() {
  return useQuery<Operator, Error>({
    queryKey: operatorAuthKeys.me,
    queryFn: fetchCurrentOperator,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOperatorLogin() {
  const setOperator = useOperatorStore((s) => s.setOperator);
  const setLoading = useOperatorStore((s) => s.setLoading);

  return useMutation<Operator, Error, OperatorLoginCredentials>({
    mutationFn: postOperatorLogin,

    onMutate: () => {
      setLoading(true);
    },

    onSuccess: (operator) => {
      setOperator(operator);
      setLoading(false);
      toast.success(`Welcome, ${operator.name.split(" ")[0]}!`);
    },

    onError: (error) => {
      setLoading(false);
      toast.error(error.message ?? "Login failed. Please try again.");
    },
  });
}

export function useOperatorLogout() {
  const logout = useOperatorStore((s) => s.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const clearAndRedirect = () => {
    logout();
    queryClient.clear();
    navigate("/admin/login", { replace: true });
  };

  return useMutation<void, Error, void>({
    mutationFn: deleteOperatorSession,

    onSuccess: () => {
      clearAndRedirect();
    },

    onError: () => {
      clearAndRedirect();
    },
  });
}
