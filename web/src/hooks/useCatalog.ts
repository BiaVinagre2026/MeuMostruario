import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/providers/TenantProvider";
import { apiClient } from "@/lib/api/client";
import {
  adaptProduct, adaptCollection, adaptCategory, adaptLook,
  type ApiProduct, type ApiCollection, type ApiCategoryWithSubs, type ApiLook,
} from "@/lib/catalog-adapter";
import type { Product, Collection, Category, Look } from "@/types/catalog";

// ── Query keys ────────────────────────────────────────────────────────────────

interface ProductsParams {
  collection_id?: string;
  category_id?:   string;
  q?:             string;
}

export const catalogKeys = {
  products:    (p?: ProductsParams, tenant?: string) => ["catalog", "products", p ?? {}, tenant ?? ""] as const,
  product:     (slug: string, tenant?: string)       => ["catalog", "product",  slug, tenant ?? ""]    as const,
  collections: (tenant?: string)                     => ["catalog", "collections", tenant ?? ""]       as const,
  categories:  (tenant?: string)                     => ["catalog", "categories",  tenant ?? ""]       as const,
  looks:       (tenant?: string)                     => ["catalog", "looks", tenant ?? ""]             as const,
  look:        (slug: string, tenant?: string)       => ["catalog", "look", slug, tenant ?? ""]        as const,
};

// ── Path builder com query string ─────────────────────────────────────────────

function withParams(base: string, params?: Record<string, string | undefined>): string {
  if (!params) return base;
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
    .join("&");
  return qs ? `${base}?${qs}` : base;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useProducts(params?: ProductsParams) {
  const { tenantSlug } = useTenant();

  return useQuery<Product[]>({
    queryKey: catalogKeys.products(params, tenantSlug),
    queryFn: async () => {
      const data = await apiClient.get<{ products: ApiProduct[] }>(
        withParams("/api/v1/products", params as Record<string, string | undefined>)
      );
      return data.products.map(adaptProduct);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProduct(slug: string) {
  const { tenantSlug } = useTenant();

  return useQuery<Product>({
    queryKey: catalogKeys.product(slug, tenantSlug),
    queryFn: async () => {
      const data = await apiClient.get<{ product: ApiProduct }>(`/api/v1/products/${slug}`);
      return adaptProduct(data.product);
    },
    enabled:   !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCollections() {
  const { tenantSlug } = useTenant();

  return useQuery<Collection[]>({
    queryKey: catalogKeys.collections(tenantSlug),
    queryFn: async () => {
      const data = await apiClient.get<{ collections: ApiCollection[] }>("/api/v1/collections");
      return data.collections.map(adaptCollection);
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useCategories() {
  const { tenantSlug } = useTenant();

  return useQuery<Category[]>({
    queryKey: catalogKeys.categories(tenantSlug),
    queryFn: async () => {
      const data = await apiClient.get<{ categories: ApiCategoryWithSubs[] }>("/api/v1/categories");
      return data.categories.map(adaptCategory);
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useLooks() {
  const { tenantSlug } = useTenant();

  return useQuery<Look[]>({
    queryKey: catalogKeys.looks(tenantSlug),
    queryFn: async () => {
      const data = await apiClient.get<{ looks: ApiLook[] }>("/api/v1/looks");
      return data.looks.map(adaptLook);
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useLook(slug: string) {
  const { tenantSlug } = useTenant();

  return useQuery<Look>({
    queryKey: catalogKeys.look(slug, tenantSlug),
    queryFn: async () => {
      const data = await apiClient.get<{ look: ApiLook }>(`/api/v1/looks/${slug}`);
      return adaptLook(data.look);
    },
    enabled:   !!slug,
    staleTime: 5 * 60 * 1000,
  });
}
