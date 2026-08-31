export type ProductStatus = "draft" | "published" | "archived" | "sold_out";
export type CollectionStatus = "draft" | "published" | "archived";

export interface ProductVariant {
  id: number;
  color: string;
  color_hex: string;
  pantone?: string | null;
  size: string;
  size_group?: string | null;
  stock_qty: number;
  image_url: string | null;
}

export interface ProductImage {
  id: number;
  photo_id?: number | null;
  urls: {
    original: string;
    regular: string;
    thumb: string;
    card?: string;
  };
  visual_metadata?: Record<string, unknown>;
  pantone?: string | null;
  approved_color?: string | null;
  size_group?: string | null;
  alt_text?: string | null;
  is_cover: boolean;
  position: number;
}

export interface ProductRef {
  id: number;
  name: string;
}

export interface CategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  slug: string;
  status: ProductStatus;
  price_wholesale: number;
  price_retail: number;
  description: string;
  fabric_composition: string;
  care_instructions: string;
  tags: string[];
  collection_id: number | null;
  category_id: number | null;
  position: number;
  collection: ProductRef | null;
  category: CategoryRef | null;
  images: ProductImage[];
  variants: ProductVariant[];
  cover_url: string | null;
  variants_count: number;
}

export interface ProductListItem {
  id: number;
  name: string;
  sku: string;
  slug: string;
  status: ProductStatus;
  price_wholesale: number;
  pantone?: string | null;
  approved_color?: string | null;
  size_group?: string | null;
  cover_url: string | null;
  collection: ProductRef | null;
  variants_count: number;
  stock_by_size: Record<string, number>;
}

export interface ProductListResponse {
  products: ProductListItem[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

export interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: CollectionStatus;
  position: number;
  products_count: number;
  cover_url: string | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface UploadResponse {
  url: string;
}
