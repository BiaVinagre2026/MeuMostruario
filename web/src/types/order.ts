export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "cancelled";

export interface OrderMember {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
}

export interface OrderItem {
  id: number;
  product_id: number | null;
  product_name: string;
  product_sku: string | null;
  color: string | null;
  size: string | null;
  qty: number;
  unit_price: string;
  subtotal: string;
}

export interface Order {
  id: number;
  status: OrderStatus;
  payment_status?: "not_required" | "pending" | "paid" | "failed" | "cancelled";
  total_units: number;
  total_value: string;
  notes: string | null;
  member: OrderMember | null;
  /** Preenchido nos pedidos que chegam por link, onde nao ha lojista cadastrado. */
  buyer?: { name: string | null; phone: string | null; email: string | null } | null;
  items_subtotal?: string | null;
  shipping?: {
    configured?: boolean;
    amount?: string | number;
    method?: string;
    estimated_days?: number | null;
  } | null;
  shipping_address?: {
    postal_code?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  } | null;
  inventory_state?: "reserved" | "committed" | "released" | null;
  created_at: string;
  updated_at: string;
}

export interface OrderFull extends Order {
  items: OrderItem[];
}

export interface OrderListResponse {
  orders: Order[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}
