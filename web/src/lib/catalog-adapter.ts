import type { Product, Collection, Category, Color, Look, LookProduct } from "@/types/catalog";

// ── Raw API shapes ────────────────────────────────────────────────────────────

export interface ApiImage {
  id: number;
  urls: { thumb?: string; small?: string; regular?: string; full?: string } | null;
  is_cover: boolean;
  alt_text: string | null;
  position: number;
}

export interface ApiVariant {
  id: number;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  image_url: string | null;
  sku: string | null;
  stock_qty: number;
  price_override: number | null;
}

export interface ApiCategory {
  id: number;
  name: string;
  slug: string;
}

export interface ApiCollection {
  id: number;
  name: string;
  slug: string;
  description?: string;
  status?: string;
}

export interface ApiProduct {
  id: number;
  slug: string;
  name: string;
  sku: string;
  price_wholesale: number | null;
  price_retail: number | null;
  currency: string;
  status: string;
  tags: string[] | null;
  description?: string | null;
  fabric_composition?: string | null;
  care_instructions?: string | null;
  size_guide?: string | null;
  whatsapp_message?: string | null;
  made_in?: string | null;
  min_order_qty?: number | null;
  category: ApiCategory | null;
  collection: ApiCollection | null;
  cover_image: ApiImage | null;
  colors?: string[];
  images?: ApiImage[];
  variants?: ApiVariant[];
}

export interface ApiCollectionDetail extends ApiCollection {
  products?: ApiProduct[];
}

interface ApiLookProduct {
  id: number;
  slug: string;
  name: string;
  sku: string;
  price_wholesale: number | null;
  price_retail: number | null;
  currency: string;
  status: string;
  tags: string[] | null;
  category: { id: number; name: string; slug: string } | null;
  collection: { id: number; name: string; slug: string } | null;
  cover_image: ApiImage | null;
  colors: string[];
}

export interface ApiLook {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  cover_url?: string | null;
  status: string;
  position: number;
  collection?: { id: number; name: string; slug: string } | null;
  product_count: number;
  products?: ApiLookProduct[];
}

export interface ApiCategoryWithSubs {
  id: number;
  name: string;
  slug: string;
  subcategories?: ApiCategoryWithSubs[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function imageUrl(img: ApiImage | null | undefined, size: "thumb" | "small" | "regular" | "full" = "regular"): string | undefined {
  if (!img?.urls) return undefined;
  return img.urls[size] ?? img.urls.regular ?? img.urls.small ?? undefined;
}

function buildColors(variants: ApiVariant[]): Color[] {
  const seen = new Map<string, Color>();
  for (const v of variants) {
    if (!v.color || seen.has(v.color)) continue;
    seen.set(v.color, {
      id:   v.color.toLowerCase().replace(/\s+/g, "-"),
      name: v.color,
      tone: hexToTone(v.color_hex),
      hex:  v.color_hex ?? undefined,
    });
  }
  return Array.from(seen.values());
}

function buildColorImages(variants: ApiVariant[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const v of variants) {
    if (!v.color || !v.image_url) continue;
    const id = v.color.toLowerCase().replace(/\s+/g, "-");
    if (!map[id]) map[id] = v.image_url;
  }
  return map;
}

function hexToTone(hex: string | null): string {
  if (!hex) return "sand";
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum < 0.15) return "noir";
  if (lum < 0.35) return "terra";
  if (lum < 0.55) return "clay";
  if (lum < 0.7)  return "ochre";
  if (r > g + 30) return "coral";
  if (g > r + 10) return "olive";
  return "sand";
}

function buildSizes(variants: ApiVariant[]): string[] {
  const order = ["PP", "P", "M", "G", "GG", "XGG", "Único"];
  const seen = new Set(variants.map((v) => v.size).filter(Boolean) as string[]);
  return order.filter((s) => seen.has(s)).concat([...seen].filter((s) => !order.includes(s)));
}

function buildStockBySize(variants: ApiVariant[]): Record<string, number> {
  const stock: Record<string, number> = {};
  for (const v of variants) {
    if (v.size) stock[v.size] = (stock[v.size] ?? 0) + v.stock_qty;
  }
  return stock;
}

// ── Adapters ──────────────────────────────────────────────────────────────────

export function adaptProduct(p: ApiProduct): Product {
  const variants = p.variants ?? [];
  const images   = p.images   ?? [];

  return {
    id:          p.slug,
    name:        p.name,
    sku:         p.sku,
    collection:  p.collection?.slug ?? "",
    category:    p.category?.slug   ?? "",
    price:       p.price_wholesale  ?? 0,
    priceRetail: p.price_retail     ?? 0,
    colors:      buildColors(variants),
    colorImages: buildColorImages(variants),
    sizes:       buildSizes(variants),
    tags:        p.tags             ?? [],
    description: p.description        ?? undefined,
    fabric:      p.fabric_composition ?? undefined,
    madeIn:      p.made_in            ?? undefined,
    moq:         p.min_order_qty      ?? 1,
    stockBySize: buildStockBySize(variants),
    featured:    false,
    imageUrl:    imageUrl(p.cover_image) ?? imageUrl(images.find((i) => i.is_cover) ?? images[0]),
    images:      images.map((i) => ({
      id:       i.id,
      urls:     i.urls ?? {},
      is_cover: i.is_cover,
      alt_text: i.alt_text,
    })),
  };
}

export function adaptCollection(c: ApiCollection): Collection {
  return {
    id:     c.slug,
    name:   c.name,
    season: "",
    pieces: 0,
    status: c.status ?? "published",
  };
}

export function adaptCategory(c: ApiCategoryWithSubs): Category {
  return {
    id:    c.slug,
    label: c.name,
    count: 0,
  };
}

export function adaptLook(l: ApiLook): Look {
  return {
    id:             l.slug,
    name:           l.name,
    description:    l.description    ?? undefined,
    coverUrl:       l.cover_url      ?? undefined,
    collectionName: l.collection?.name,
    collectionSlug: l.collection?.slug,
    productCount:   l.product_count,
    products: l.products?.map((p): LookProduct => ({
      id:            p.slug,
      name:          p.name,
      sku:           p.sku,
      collectionSlug: p.collection?.slug,
      price:         p.price_wholesale ?? 0,
      priceRetail:   p.price_retail    ?? 0,
      colors:        p.colors          ?? [],
      imageUrl:      imageUrl(p.cover_image),
    })),
  };
}
