import { apiClient } from "./client";
import type { Collection, Category } from "@/types/product";

export async function getCollections(): Promise<Collection[]> {
  const res = await apiClient.get<{ collections: Collection[] }>("/api/v1/admin/collections");
  return res.collections;
}

export async function getCollection(id: number): Promise<Collection> {
  const res = await apiClient.get<{ collection: Collection }>(`/api/v1/admin/collections/${id}`);
  return res.collection;
}

export async function createCollection(data: Partial<Collection>): Promise<Collection> {
  const res = await apiClient.post<{ collection: Collection }>("/api/v1/admin/collections", { collection: data });
  return res.collection;
}

export async function updateCollection(
  id: number,
  data: Partial<Collection>
): Promise<Collection> {
  const res = await apiClient.patch<{ collection: Collection }>(`/api/v1/admin/collections/${id}`, { collection: data });
  return res.collection;
}

export function deleteCollection(id: number): Promise<{ ok: boolean }> {
  return apiClient.del<{ ok: boolean }>(`/api/v1/admin/collections/${id}`);
}

export async function getCategories(): Promise<Category[]> {
  const res = await apiClient.get<{ categories: Category[] }>("/api/v1/admin/categories");
  return res.categories;
}
