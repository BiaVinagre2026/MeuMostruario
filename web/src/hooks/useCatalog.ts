import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/providers/TenantProvider";
import { apiClient } from "@/lib/api/client";
import {
  adaptProduct, adaptCollection, adaptCategory,
  type ApiProduct, type ApiCollection, type ApiCategoryWithSubs,
} from "@/lib/catalog-adapter";
import type { Product, Collection, Category } from "@/types/catalog";

// ── Query keys ────────────────────────────────────────────────────────────────

interface ProductsParams {
  collection_id?: string;
  category_id?:   string;
  q?:             string;
  page?:          string;
  per_page?:      string;
}

interface PaginationMeta {
  current_page: number;
  total_pages: number;
  total_count: number;
  per_page: number;
}

export const catalogKeys = {
  products:    (p?: ProductsParams, tenant?: string) => ["catalog", "products", p ?? {}, tenant ?? ""] as const,
  product:     (slug: string, tenant?: string)       => ["catalog", "product",  slug, tenant ?? ""]    as const,
  collections: (tenant?: string)                     => ["catalog", "collections", tenant ?? ""]       as const,
  categories:  (tenant?: string)                     => ["catalog", "categories",  tenant ?? ""]       as const,
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
  const query = useProductsQuery(params);

  return {
    ...query,
    data: query.data?.products,
  };
}

export function useProductsQuery(params?: ProductsParams) {
  const { tenantSlug } = useTenant();

  return useQuery<{ products: Product[]; meta: PaginationMeta }>({
    queryKey: catalogKeys.products(params, tenantSlug),
    queryFn: async () => {
      const data = await apiClient.get<{ products: ApiProduct[]; meta: PaginationMeta }>(
        withParams("/api/v1/products", params as Record<string, string | undefined>)
      );
      return {
        products: data.products.map(adaptProduct),
        meta: data.meta,
      };
    },
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
    enabled: !!slug,
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
