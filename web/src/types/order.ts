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
  total_units: number;
  total_value: string;
  notes: string | null;
  member: OrderMember | null;
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
