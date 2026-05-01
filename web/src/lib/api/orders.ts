import { apiClient } from "./client";
import type { OrderFull, OrderListResponse, OrderStatus } from "@/types/order";

export interface GetOrdersParams {
  page?: number;
  per_page?: number;
  status?: string;
  member_id?: number;
  q?: string;
}

export function getOrders(params?: GetOrdersParams): Promise<OrderListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.per_page) query.set("per_page", String(params.per_page));
  if (params?.status) query.set("status", params.status);
  if (params?.member_id) query.set("member_id", String(params.member_id));
  if (params?.q) query.set("q", params.q);
  const qs = query.toString();
  return apiClient.get<OrderListResponse>(`/api/v1/admin/orders${qs ? `?${qs}` : ""}`);
}

export function getOrder(id: number): Promise<{ order: OrderFull }> {
  return apiClient.get<{ order: OrderFull }>(`/api/v1/admin/orders/${id}`);
}

export function updateOrderStatus(
  id: number,
  status: OrderStatus
): Promise<{ order: OrderFull }> {
  return apiClient.patch<{ order: OrderFull }>(`/api/v1/admin/orders/${id}`, {
    order: { status },
  });
}
