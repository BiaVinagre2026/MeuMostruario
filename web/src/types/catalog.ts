export interface Color {
  id: string;
  name: string;
  tone: string;
  hex?: string;
}

export interface ProductImage {
  id: number;
  urls: { thumb?: string; small?: string; regular?: string; full?: string };
  is_cover: boolean;
  alt_text: string | null;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  collection: string;
  category: string;
  price: number;
  priceRetail: number;
  colors: Color[];
  colorImages?: Record<string, string>;
  sizes: string[];
  tags?: string[];
  description?: string;
  fabric?: string;
  madeIn?: string;
  moq: number;
  stockBySize?: Record<string, number>;
  featured?: boolean;
  imageUrl?: string;
  images?: ProductImage[];
}

export interface Collection {
  id: string;
  name: string;
  season: string;
  pieces: number;
  status: string;
}

export interface Category {
  id: string;
  label: string;
  count: number;
}

export interface Tier {
  min: number;
  max: number | null;
  discount: number;
  label: string;
}

export interface Tenant {
  id: string;
  name: string;
  tagline: string;
  handle: string;
  location: string;
  whatsapp: string;
  minOrder: { units: number; amount: number };
  currency: string;
  cnpj: string;
}

export interface ToneEntry {
  bg: string;
  fg: string;
}

export interface CartItem extends Product {
  colorId: string;
  qty: Record<string, number>;
  total: number;
}
