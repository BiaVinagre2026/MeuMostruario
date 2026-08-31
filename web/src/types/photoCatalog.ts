export type PhotoStatus = "uploaded" | "processing" | "needs_review" | "approved" | "published" | "error";
export type PhotoBatchStatus = "draft" | "uploading" | "processing" | "review" | "reviewed" | "published" | "error";
export type CatalogLinkType = "public_client" | "wholesale_buyer" | "selection";

export const SIZE_GROUPS = ["P/M", "M/G", "Unico", "Plus 1", "Plus 2"] as const;
export type SizeGroup = typeof SIZE_GROUPS[number];

export interface Photo {
  id: number;
  photo_batch_id: number | null;
  product_id: number | null;
  product_name?: string | null;
  product_variant_id: number | null;
  original_filename: string | null;
  urls: Record<string, string>;
  display_url?: string | null;
  thumb_url?: string | null;
  status: PhotoStatus;
  suggested_color?: string | null;
  approved_color?: string | null;
  suggested_pantone?: string | null;
  approved_pantone?: string | null;
  suggested_model?: string | null;
  approved_model?: string | null;
  suggested_size_group?: SizeGroup | null;
  approved_size_group?: SizeGroup | null;
  suggested_sku?: string | null;
  suggestion_source?: string | null;
  suggestion_group?: string | null;
  confidence_score?: number | null;
  low_confidence?: boolean;
}

export interface PhotoBatch {
  id: number;
  name: string;
  status: PhotoBatchStatus;
  total_count: number;
  processed_count: number;
  error_count: number;
  photos?: Photo[];
  created_at: string;
  updated_at: string;
}

export interface CatalogItem {
  id: number;
  product_id: number | null;
  photo_id: number | null;
  product_name?: string | null;
  product_sku?: string | null;
  photo_url?: string | null;
  model?: string | null;
  color?: string | null;
  size_group?: SizeGroup | null;
  position: number;
  visible: boolean;
}

export interface CatalogSummary {
  sku_labels: string[];
  model_labels: string[];
  color_labels: string[];
  size_groups: string[];
  public_links_count: number;
  wholesale_links_count: number;
}

export interface CatalogLink {
  id: number;
  catalog_id?: number;
  token: string;
  slug?: string | null;
  link_type: CatalogLinkType;
  show_prices: boolean;
  allow_order: boolean;
  allow_payment: boolean;
  expires_at?: string | null;
  url?: string;
}

export interface Catalog {
  id: number;
  name: string;
  description?: string | null;
  status: "draft" | "published" | "archived";
  source: string;
  items_count: number;
  summary?: CatalogSummary;
  items?: CatalogItem[];
  links: CatalogLink[];
  created_at: string;
  updated_at: string;
}

export interface PublicCatalogItem {
  id: number;
  product_id: number | null;
  photo_id: number | null;
  name: string;
  sku?: string | null;
  description?: string | null;
  image_url?: string | null;
  thumb_url?: string | null;
  color?: string | null;
  pantone?: string | null;
  model?: string | null;
  size_group?: SizeGroup | null;
  sizes: string[];
  price?: number | null;
  price_retail?: number | null;
}

export interface PublicCatalogLink {
  id: number;
  token: string;
  slug?: string | null;
  link_type: CatalogLinkType;
  show_prices: boolean;
  allow_order: boolean;
  allow_payment: boolean;
  /** Pedido mínimo do tenant. Zero significa sem mínimo. */
  min_order_amount?: number | string | null;
  catalog: { id: number; name: string; description?: string | null };
  items: PublicCatalogItem[];
}
