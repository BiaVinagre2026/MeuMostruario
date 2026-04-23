import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Partner } from "@/types/partner";

interface PartnerState {
  partner: Partner | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface PartnerActions {
  setPartner: (partner: Partner | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

type PartnerStore = PartnerState & PartnerActions;

export const usePartnerStore = create<PartnerStore>()(
  persist(
    (set) => ({
      partner: null,
      isAuthenticated: false,
      isLoading: true,

      setPartner: (partner) =>
        set({
          partner: partner,
          isAuthenticated: partner !== null,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      logout: () =>
        set({
          partner: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    {
      name: "app-partner-auth",
      partialize: (state) => ({
        partner: state.partner,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
