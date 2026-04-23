import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Operator } from "@/types/operator";

interface OperatorState {
  operator: Operator | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeTenantSlug: string | null;
}

interface OperatorActions {
  setOperator: (op: Operator | null) => void;
  setLoading: (loading: boolean) => void;
  setActiveTenantSlug: (slug: string | null) => void;
  logout: () => void;
}

type OperatorStore = OperatorState & OperatorActions;

export const useOperatorStore = create<OperatorStore>()(
  persist(
    (set) => ({
      operator: null,
      isAuthenticated: false,
      isLoading: true,
      activeTenantSlug: null,

      setOperator: (op) =>
        set({
          operator: op,
          isAuthenticated: op !== null,
          ...(op?.role === "admin" ? { activeTenantSlug: op.tenant_slug } : {}),
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setActiveTenantSlug: (slug) => set({ activeTenantSlug: slug }),

      logout: () =>
        set({
          operator: null,
          isAuthenticated: false,
          isLoading: false,
          activeTenantSlug: null,
        }),
    }),
    {
      name: "app-operator-auth",
      partialize: (state) => ({
        operator: state.operator,
        isAuthenticated: state.isAuthenticated,
        activeTenantSlug: state.activeTenantSlug,
      }),
    }
  )
);
