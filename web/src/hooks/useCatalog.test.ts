import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useProducts, useProduct, useCollections, useCategories, catalogKeys } from "./useCatalog";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/providers/TenantProvider", () => ({
  useTenant: () => ({ tenantSlug: "demo" }),
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

import { apiClient } from "@/lib/api/client";

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Query key tests ───────────────────────────────────────────────────────────

describe("catalogKeys", () => {
  it("products key includes tenant slug", () => {
    expect(catalogKeys.products({}, "demo")).toContain("demo");
  });

  it("product key includes slug and tenant", () => {
    const key = catalogKeys.product("calca-slim", "demo");
    expect(key).toContain("calca-slim");
    expect(key).toContain("demo");
  });

  it("collections key includes tenant slug", () => {
    expect(catalogKeys.collections("demo")).toContain("demo");
  });

  it("categories key includes tenant slug", () => {
    expect(catalogKeys.categories("demo")).toContain("demo");
  });
});

// ── useProducts ───────────────────────────────────────────────────────────────

describe("useProducts", () => {
  it("returns adapted products on success", async () => {
    mockGet.mockResolvedValueOnce({
      products: [
        {
          id: 1,
          slug: "calca-slim",
          name: "Calça Slim",
          sku: "CAL-001",
          price_wholesale: 89.9,
          price_retail: 179.9,
          currency: "BRL",
          status: "published",
          tags: [],
          category: null,
          collection: null,
          cover_image: null,
        },
      ],
    });

    const { result } = renderHook(() => useProducts(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].id).toBe("calca-slim");
    expect(result.current.data![0].name).toBe("Calça Slim");
    expect(result.current.data![0].price).toBe(89.9);
  });

  it("calls the correct endpoint", async () => {
    mockGet.mockResolvedValueOnce({ products: [] });

    const { result } = renderHook(() => useProducts(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith("/api/v1/products");
  });

  it("appends filter params to the URL", async () => {
    mockGet.mockResolvedValueOnce({ products: [] });

    const { result } = renderHook(
      () => useProducts({ collection_id: "42" }),
      { wrapper: makeWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining("collection_id=42")
    );
  });

  it("returns empty array when API returns empty products", async () => {
    mockGet.mockResolvedValueOnce({ products: [] });

    const { result } = renderHook(() => useProducts(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it("surfaces error state on API failure", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useProducts(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useProduct ────────────────────────────────────────────────────────────────

describe("useProduct", () => {
  it("is disabled when slug is empty", () => {
    const { result } = renderHook(() => useProduct(""), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches the correct endpoint for a given slug", async () => {
    mockGet.mockResolvedValueOnce({
      product: {
        id: 1,
        slug: "blusa-fitness",
        name: "Blusa Fitness",
        sku: "BLU-001",
        price_wholesale: 65,
        price_retail: 130,
        currency: "BRL",
        status: "published",
        tags: [],
        category: null,
        collection: null,
        cover_image: null,
      },
    });

    const { result } = renderHook(() => useProduct("blusa-fitness"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith("/api/v1/products/blusa-fitness");
    expect(result.current.data!.id).toBe("blusa-fitness");
  });
});

// ── useCollections ────────────────────────────────────────────────────────────

describe("useCollections", () => {
  it("returns adapted collections", async () => {
    mockGet.mockResolvedValueOnce({
      collections: [{ id: 1, name: "Verão 2025", slug: "verao-2025", status: "published" }],
    });

    const { result } = renderHook(() => useCollections(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data![0].id).toBe("verao-2025");
    expect(result.current.data![0].name).toBe("Verão 2025");
  });
});

// ── useCategories ─────────────────────────────────────────────────────────────

describe("useCategories", () => {
  it("returns adapted categories", async () => {
    mockGet.mockResolvedValueOnce({
      categories: [{ id: 1, name: "Calças", slug: "calcas", count: 5 }],
    });

    const { result } = renderHook(() => useCategories(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data![0].id).toBe("calcas");
    expect(result.current.data![0].label).toBe("Calças");
  });
});
