import { apiClient } from "./client";

export interface MareCoralRetailSettings {
  catalog_link_id: number;
  enabled: boolean;
  flat_rate: string | null;
  free_shipping_threshold: string | null;
  estimated_days: number;
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
