import { apiClient } from "./client";

export interface MareCoralRetailSettings {
  catalog_link_id: number;
  enabled: boolean;
  flat_rate: string | null;
  free_shipping_threshold: string | null;
  estimated_days: number | null;
  origin_postal_code: string | null;
}

export function getMareCoralRetailSettings(): Promise<MareCoralRetailSettings> {
  return apiClient.get<MareCoralRetailSettings>("/api/v1/admin/mare_coral/retail_settings");
}

export function updateMareCoralRetailSettings(
  payload: Omit<MareCoralRetailSettings, "catalog_link_id">
): Promise<MareCoralRetailSettings> {
  return apiClient.patch<MareCoralRetailSettings>("/api/v1/admin/mare_coral/retail_settings", payload);
}

export interface MareCoralStorefrontProduct {
  id: number;
  name: string;
  sku: string | null;
  slug: string;
  price_retail: string | number | null;
  cover_url: string | null;
  variants_count: number;
  stock_qty: number;
  selected: boolean;
  storefront_position: number | null;
  eligible: boolean;
  eligibility_reasons: string[];
}

export interface MareCoralStorefront {
  catalog: {
    id: number;
    name: string;
    catalog_link_id: number;
    selected_count: number;
  };
  products: MareCoralStorefrontProduct[];
}

export function getMareCoralStorefront(): Promise<MareCoralStorefront> {
  return apiClient.get<MareCoralStorefront>("/api/v1/admin/mare_coral/storefront");
}

export function updateMareCoralStorefront(productIds: number[]): Promise<MareCoralStorefront> {
  return apiClient.patch<MareCoralStorefront>("/api/v1/admin/mare_coral/storefront", {
    product_ids: productIds,
  });
}
