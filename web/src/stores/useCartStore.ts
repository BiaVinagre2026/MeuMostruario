import { create } from "zustand";
import type { CartItem } from "@/types/catalog";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  add: (item: CartItem) => void;
  remove: (index: number) => void;
  update: (index: number, item: Partial<CartItem>) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  totalUnits: () => number;
  totalAmount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,

  add: (item) => set((s) => ({ items: [...s.items, item], isOpen: true })),
  remove: (index) => set((s) => ({ items: s.items.filter((_, i) => i !== index) })),
  update: (index, patch) =>
    set((s) => ({
      items: s.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    })),

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  totalUnits: () => get().items.reduce((a, item) => a + item.total, 0),
  totalAmount: () => get().items.reduce((a, item) => a + item.total * item.price, 0),
}));
