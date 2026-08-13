import { apiClient } from "./client";
import type { Catalog, CatalogLink, PhotoBatch, PublicCatalogLink } from "@/types/photoCatalog";

interface Paginated<TName extends string, T> {
  meta: { current_page: number; total_pages: number; total_count: number; per_page: number };
  [key: string]: T[] | Paginated<TName, T>["meta"];
}

export async function getPhotoBatches(): Promise<PhotoBatch[]> {
  const res = await apiClient.get<Paginated<"photo_batches", PhotoBatch>>("/api/v1/admin/photo_batches?per_page=50");
  return res.photo_batches as PhotoBatch[];
}

export async function getPhotoBatch(id: number): Promise<PhotoBatch> {
  const res = await apiClient.get<{ photo_batch: PhotoBatch }>(`/api/v1/admin/photo_batches/${id}`);
  return res.photo_batch;
}

export async function createPhotoBatch(name: string, files: File[]): Promise<PhotoBatch> {
  const form = new FormData();
  form.append("name", name);
  files.forEach((file) => form.append("files[]", file));
  const res = await apiClient.postForm<{ photo_batch: PhotoBatch }>("/api/v1/admin/photo_batches", form);
  return res.photo_batch;
}

export async function bulkUpdatePhotos(payload: {
  photo_ids: number[];
  approved_color?: string;
  approved_pantone?: string;
  approved_model?: string;
  approved_size_group?: string;
  product_id?: number;
  status?: string;
  approve?: boolean;
  apply_suggestions?: boolean;
  create_product?: boolean;
}) {
  return apiClient.patch<{ photos: unknown[] }>("/api/v1/admin/photos/bulk_update", payload);
}

export async function getCatalogs(): Promise<Catalog[]> {
  const res = await apiClient.get<Paginated<"catalogs", Catalog>>("/api/v1/admin/catalogs?per_page=50");
  return res.catalogs as Catalog[];
}

export async function getCatalog(id: number): Promise<Catalog> {
  const res = await apiClient.get<{ catalog: Catalog }>(`/api/v1/admin/catalogs/${id}`);
  return res.catalog;
}

export async function createCatalog(payload: {
  catalog: { name: string; description?: string; status?: string; source?: string };
  photo_ids?: number[];
  product_ids?: number[];
}): Promise<Catalog> {
  const res = await apiClient.post<{ catalog: Catalog }>("/api/v1/admin/catalogs", payload);
  return res.catalog;
}

export async function updateCatalog(id: number, payload: {
  catalog: { name?: string; description?: string; status?: string; source?: string };
  photo_ids?: number[];
  product_ids?: number[];
}): Promise<Catalog> {
  const res = await apiClient.patch<{ catalog: Catalog }>(`/api/v1/admin/catalogs/${id}`, payload);
  return res.catalog;
}

export async function deleteCatalog(id: number): Promise<void> {
  await apiClient.del<void>(`/api/v1/admin/catalogs/${id}`);
}

/** Revoga o link expirando agora, sem apagar — pedidos ja recebidos continuam ligados a ele. */
export async function revokeCatalogLink(catalogId: number, linkId: number): Promise<CatalogLink> {
  const res = await apiClient.patch<{ catalog_link: CatalogLink }>(
    `/api/v1/admin/catalogs/${catalogId}/links/${linkId}`,
    { catalog_link: { expires_at: new Date().toISOString() } }
  );
  return res.catalog_link;
}

export async function deleteCatalogLink(catalogId: number, linkId: number): Promise<void> {
  await apiClient.del<void>(`/api/v1/admin/catalogs/${catalogId}/links/${linkId}`);
}

export async function createCatalogLink(catalogId: number, payload: {
  link_type: "public_client" | "wholesale_buyer" | "selection";
  slug?: string;
  show_prices?: boolean;
  allow_order?: boolean;
  allow_payment?: boolean;
  expires_at?: string;
}): Promise<CatalogLink> {
  const res = await apiClient.post<{ catalog_link: CatalogLink }>(
    `/api/v1/admin/catalogs/${catalogId}/links`,
    { catalog_link: payload }
  );
  return res.catalog_link;
}

export async function getPublicCatalogLink(token: string): Promise<PublicCatalogLink> {
  const res = await apiClient.get<{ catalog_link: PublicCatalogLink }>(`/api/v1/catalog_links/${token}`);
  return res.catalog_link;
}

export async function sendCatalogInterest(token: string, payload: {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  catalog_item_ids: number[];
}) {
  return apiClient.post(`/api/v1/catalog_links/${token}/interests`, payload);
}

export async function createSelectionLink(token: string, catalog_item_ids: number[]) {
  return apiClient.post<{ catalog_link: CatalogLink }>(`/api/v1/catalog_links/${token}/selections`, {
    catalog_item_ids,
  });
}

export interface TokenOrderResponse {
  order: { id: number; status: string; payment_status: string; total_value: string | number };
  payment?: {
    id: number;
    status: string;
    payment_method: string | null;
    amount: string | number;
    checkout_url?: string | null;
    pix_qr_code?: string | null;
    pix_expiration?: string | null;
    gateway_reference?: string | null;
    error_message?: string | null;
  } | null;
}

export async function createTokenOrder(token: string, payload: unknown): Promise<TokenOrderResponse> {
  return apiClient.post<TokenOrderResponse>(`/api/v1/catalog_links/${token}/orders`, payload);
}
