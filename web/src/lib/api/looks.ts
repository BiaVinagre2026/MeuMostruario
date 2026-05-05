import { apiClient } from "./client";

export interface AdminLook {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  status: "draft" | "published" | "archived";
  position: number;
  collection: { id: number; name: string } | null;
  product_count: number;
  products?: Array<{ id: number; name: string; sku: string; slug: string }>;
}

export type LookPayload = {
  name: string;
  description?: string;
  cover_url?: string;
  status: "draft" | "published" | "archived";
  position?: number;
  collection_id?: number | null;
  product_ids?: number[];
};

export async function getAdminLooks(): Promise<AdminLook[]> {
  const res = await apiClient.get<{ looks: AdminLook[] }>("/api/v1/admin/looks");
  return res.looks;
}

export async function getAdminLook(id: number): Promise<AdminLook> {
  const res = await apiClient.get<{ look: AdminLook }>(`/api/v1/admin/looks/${id}`);
  return res.look;
}

export async function createAdminLook(data: LookPayload): Promise<AdminLook> {
  const res = await apiClient.post<{ look: AdminLook }>("/api/v1/admin/looks", {
    look: { name: data.name, description: data.description, cover_url: data.cover_url, status: data.status, position: data.position, collection_id: data.collection_id },
    product_ids: data.product_ids,
  });
  return res.look;
}

export async function updateAdminLook(id: number, data: LookPayload): Promise<AdminLook> {
  const res = await apiClient.patch<{ look: AdminLook }>(`/api/v1/admin/looks/${id}`, {
    look: { name: data.name, description: data.description, cover_url: data.cover_url, status: data.status, position: data.position, collection_id: data.collection_id },
    product_ids: data.product_ids,
  });
  return res.look;
}

export async function deleteAdminLook(id: number): Promise<void> {
  await apiClient.del(`/api/v1/admin/looks/${id}`);
}
