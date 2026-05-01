import { apiClient } from "./client";
import type {
  Product,
  ProductListResponse,
  ProductVariant,
  ProductImage,
  UploadResponse,
} from "@/types/product";

export interface GetProductsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  collection_id?: number;
}

export function getProducts(params?: GetProductsParams): Promise<ProductListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.per_page) query.set("per_page", String(params.per_page));
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.collection_id) query.set("collection_id", String(params.collection_id));
  const qs = query.toString();
  return apiClient.get<ProductListResponse>(`/api/v1/admin/products${qs ? `?${qs}` : ""}`);
}

export async function getProduct(id: number): Promise<Product> {
  const res = await apiClient.get<{ product: Product }>(`/api/v1/admin/products/${id}`);
  return res.product;
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  const res = await apiClient.post<{ product: Product }>("/api/v1/admin/products", { product: data });
  return res.product;
}

export async function updateProduct(id: number, data: Partial<Product>): Promise<Product> {
  const res = await apiClient.patch<{ product: Product }>(`/api/v1/admin/products/${id}`, { product: data });
  return res.product;
}

export function deleteProduct(id: number): Promise<{ ok: boolean }> {
  return apiClient.del<{ ok: boolean }>(`/api/v1/admin/products/${id}`);
}

export async function createVariant(
  productId: number,
  data: Omit<ProductVariant, "id">
): Promise<ProductVariant> {
  const res = await apiClient.post<{ variant: ProductVariant }>(
    `/api/v1/admin/products/${productId}/variants`,
    { variant: data }
  );
  return res.variant;
}

export async function updateVariant(
  productId: number,
  variantId: number,
  data: Partial<ProductVariant>
): Promise<ProductVariant> {
  const res = await apiClient.patch<{ variant: ProductVariant }>(
    `/api/v1/admin/products/${productId}/variants/${variantId}`,
    { variant: data }
  );
  return res.variant;
}

export function deleteVariant(
  productId: number,
  variantId: number
): Promise<{ ok: boolean }> {
  return apiClient.del<{ ok: boolean }>(
    `/api/v1/admin/products/${productId}/variants/${variantId}`
  );
}

export async function addProductImage(
  productId: number,
  imageUrl: string,
  isCover = false
): Promise<ProductImage> {
  const res = await apiClient.post<{ image: ProductImage }>(
    `/api/v1/admin/products/${productId}/images`,
    { image_url: imageUrl, is_cover: isCover }
  );
  return res.image;
}

export function deleteProductImage(
  productId: number,
  imageId: number
): Promise<{ ok: boolean }> {
  return apiClient.del<{ ok: boolean }>(
    `/api/v1/admin/products/${productId}/images/${imageId}`
  );
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? "";
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/api/v1/admin/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json() as Promise<UploadResponse>;
}
