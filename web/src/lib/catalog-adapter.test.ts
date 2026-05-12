import { describe, it, expect } from "vitest";
import {
  adaptProduct,
  adaptCollection,
  adaptCategory,
  type ApiProduct,
  type ApiCollection,
  type ApiCategoryWithSubs,
  type ApiImage,
  type ApiVariant,
} from "./catalog-adapter";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeImage = (overrides: Partial<ApiImage> = {}): ApiImage => ({
  id: 1,
  urls: { thumb: "/t.jpg", small: "/s.jpg", regular: "/r.jpg", full: "/f.jpg" },
  is_cover: true,
  alt_text: "Produto foto",
  position: 0,
  ...overrides,
});

const makeVariant = (overrides: Partial<ApiVariant> = {}): ApiVariant => ({
  id: 1,
  size: "M",
  color: "Preto",
  color_hex: "#000000",
  image_url: "/uploads/preto.jpg",
  sku: "VAR-001",
  stock_qty: 10,
  price_override: null,
  ...overrides,
});

const makeProduct = (overrides: Partial<ApiProduct> = {}): ApiProduct => ({
  id: 1,
  slug: "calca-slim",
  name: "Calça Slim",
  sku: "CAL-001",
  price_wholesale: 89.9,
  price_retail: 179.9,
  currency: "BRL",
  status: "published",
  tags: ["fitness", "slim"],
  category: { id: 1, name: "Calças", slug: "calcas" },
  collection: { id: 2, name: "Verão 2025", slug: "verao-2025" },
  cover_image: makeImage(),
  variants: [makeVariant()],
  images: [makeImage()],
  ...overrides,
});

// ── adaptProduct ──────────────────────────────────────────────────────────────

describe("adaptProduct", () => {
  it("maps slug as id", () => {
    const p = adaptProduct(makeProduct());
    expect(p.id).toBe("calca-slim");
  });

  it("maps price_wholesale to price", () => {
    const p = adaptProduct(makeProduct({ price_wholesale: 79.9 }));
    expect(p.price).toBe(79.9);
  });

  it("maps price_retail to priceRetail", () => {
    const p = adaptProduct(makeProduct({ price_retail: 159.9 }));
    expect(p.priceRetail).toBe(159.9);
  });

  it("maps made_in to madeIn", () => {
    const p = adaptProduct(makeProduct({ made_in: "Brasil" }));
    expect(p.madeIn).toBe("Brasil");
  });

  it("maps min_order_qty to moq", () => {
    const p = adaptProduct(makeProduct({ min_order_qty: 6 }));
    expect(p.moq).toBe(6);
  });

  it("defaults moq to 1 when min_order_qty is null", () => {
    const p = adaptProduct(makeProduct({ min_order_qty: null }));
    expect(p.moq).toBe(1);
  });

  it("defaults price to 0 when price_wholesale is null", () => {
    const p = adaptProduct(makeProduct({ price_wholesale: null }));
    expect(p.price).toBe(0);
  });

  it("defaults tags to [] when null", () => {
    const p = adaptProduct(makeProduct({ tags: null }));
    expect(p.tags).toEqual([]);
  });

  it("maps category slug", () => {
    const p = adaptProduct(makeProduct());
    expect(p.category).toBe("calcas");
  });

  it("maps collection slug", () => {
    const p = adaptProduct(makeProduct());
    expect(p.collection).toBe("verao-2025");
  });

  it("returns empty string for category when null", () => {
    const p = adaptProduct(makeProduct({ category: null }));
    expect(p.category).toBe("");
  });

  it("builds colors from variants", () => {
    const p = adaptProduct(
      makeProduct({
        variants: [
          makeVariant({ color: "Preto", color_hex: "#000000" }),
          makeVariant({ id: 2, color: "Branco", color_hex: "#ffffff" }),
        ],
      })
    );
    expect(p.colors).toHaveLength(2);
    expect(p.colors[0].name).toBe("Preto");
    expect(p.colors[1].name).toBe("Branco");
  });

  it("deduplicates colors with the same name", () => {
    const p = adaptProduct(
      makeProduct({
        variants: [
          makeVariant({ id: 1, color: "Preto", size: "P" }),
          makeVariant({ id: 2, color: "Preto", size: "M" }),
        ],
      })
    );
    expect(p.colors).toHaveLength(1);
  });

  it("only maps /uploads/ URLs to colorImages", () => {
    const p = adaptProduct(
      makeProduct({
        variants: [
          makeVariant({ color: "Preto", image_url: "/uploads/preto.jpg" }),
          makeVariant({ id: 2, color: "Branco", image_url: "https://cdn.external.com/branco.jpg" }),
        ],
      })
    );
    expect(p.colorImages["preto"]).toBe("/uploads/preto.jpg");
    expect(p.colorImages["branco"]).toBeUndefined();
  });

  it("builds sizes in canonical order", () => {
    const p = adaptProduct(
      makeProduct({
        variants: [
          makeVariant({ size: "GG" }),
          makeVariant({ id: 2, size: "P" }),
          makeVariant({ id: 3, size: "M" }),
        ],
      })
    );
    expect(p.sizes).toEqual(["P", "M", "GG"]);
  });

  it("aggregates stock by size", () => {
    const p = adaptProduct(
      makeProduct({
        variants: [
          makeVariant({ size: "M", stock_qty: 5 }),
          makeVariant({ id: 2, size: "M", stock_qty: 3, color: "Branco" }),
          makeVariant({ id: 3, size: "G", stock_qty: 2, color: "Preto" }),
        ],
      })
    );
    expect(p.stockBySize["M"]).toBe(8);
    expect(p.stockBySize["G"]).toBe(2);
  });

  it("uses cover image URL as imageUrl", () => {
    const p = adaptProduct(makeProduct({ cover_image: makeImage({ urls: { regular: "/cover.jpg" } }) }));
    expect(p.imageUrl).toBe("/cover.jpg");
  });
});

// ── adaptCollection ───────────────────────────────────────────────────────────

describe("adaptCollection", () => {
  const raw: ApiCollection = { id: 1, name: "Verão 2025", slug: "verao-2025", status: "published" };

  it("maps slug as id", () => {
    expect(adaptCollection(raw).id).toBe("verao-2025");
  });

  it("maps name", () => {
    expect(adaptCollection(raw).name).toBe("Verão 2025");
  });

  it("defaults status to published when missing", () => {
    expect(adaptCollection({ id: 1, name: "X", slug: "x" }).status).toBe("published");
  });
});

// ── adaptCategory ─────────────────────────────────────────────────────────────

describe("adaptCategory", () => {
  const raw: ApiCategoryWithSubs = { id: 1, name: "Calças", slug: "calcas" };

  it("maps slug as id", () => {
    expect(adaptCategory(raw).id).toBe("calcas");
  });

  it("maps name as label", () => {
    expect(adaptCategory(raw).label).toBe("Calças");
  });

  it("sets count to 0 when not provided", () => {
    expect(adaptCategory(raw).count).toBe(0);
  });
});
