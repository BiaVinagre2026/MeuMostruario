import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import PhotoBatchReview from "./PhotoBatchReview";
import { bulkUpdatePhotos, createCatalog, createCatalogLink, getPhotoBatch } from "@/lib/api/photoCatalog";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/admin/AdminLayout", () => ({
  AdminLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/api/photoCatalog", () => ({
  bulkUpdatePhotos: vi.fn(),
  createCatalog: vi.fn(),
  createCatalogLink: vi.fn(),
  getPhotoBatch: vi.fn(),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/admin/photo-batches/12"]}>
        <Routes>
          <Route path="/admin/photo-batches/:id" element={<PhotoBatchReview />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("PhotoBatchReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPhotoBatch).mockResolvedValue({
      id: 12,
      name: "Lote editorial",
      status: "review",
      total_count: 4,
      processed_count: 4,
      error_count: 0,
      created_at: "2026-05-22T10:00:00Z",
      updated_at: "2026-05-22T10:10:00Z",
      photos: [
        {
          id: 1,
          photo_batch_id: 12,
          product_id: null,
          product_variant_id: null,
          original_filename: "foto-1.jpeg",
          urls: {},
          display_url: "/uploads/demo/catalogo-001.jpeg",
          status: "needs_review",
          suggested_sku: "FIT-101",
          suggestion_group: "shape_short_p_m",
          suggested_model: "Conjunto Shape Short",
          suggested_color: "Preto",
          suggested_size_group: "P/M",
          confidence_score: 0.91,
        },
        {
          id: 2,
          photo_batch_id: 12,
          product_id: null,
          product_variant_id: null,
          original_filename: "foto-2.jpeg",
          urls: {},
          display_url: "/uploads/demo/catalogo-002.jpeg",
          status: "needs_review",
          suggested_sku: "FIT-101",
          suggestion_group: "shape_short_p_m",
          suggested_model: "Conjunto Shape Short",
          suggested_color: "Preto",
          suggested_size_group: "P/M",
          confidence_score: 0.92,
        },
        {
          id: 3,
          photo_batch_id: 12,
          product_id: null,
          product_variant_id: null,
          original_filename: "foto-3.jpeg",
          urls: {},
          display_url: "/uploads/demo/catalogo-003.jpeg",
          status: "approved",
          suggested_sku: "FIT-102",
          suggestion_group: "pulse_rosa",
          suggested_model: "Conjunto Pulse Ombro Unico",
          suggested_color: "Rosa Energia",
          suggested_size_group: "P/M",
          confidence_score: 0.88,
        },
        {
          id: 4,
          photo_batch_id: 12,
          product_id: null,
          product_variant_id: null,
          original_filename: "foto-4.jpeg",
          urls: {},
          display_url: "/uploads/demo/catalogo-004.jpeg",
          status: "approved",
          suggested_sku: "FIT-103",
          suggestion_group: "pulse_vinho_plus",
          suggested_model: "Conjunto Pulse Legging Plus",
          suggested_color: "Vinho Intenso",
          suggested_size_group: "Plus 1",
          confidence_score: 0.9,
        },
      ],
    });
    vi.mocked(bulkUpdatePhotos).mockResolvedValue({ photos: [] });
    vi.mocked(createCatalog).mockResolvedValue({
      id: 88,
      name: "Catalogo teste",
      status: "published",
      source: "photo_batch",
      items_count: 2,
      links: [],
      created_at: "2026-05-22T10:11:00Z",
      updated_at: "2026-05-22T10:11:00Z",
    });
    vi.mocked(createCatalogLink)
      .mockResolvedValueOnce({
        id: 301,
        token: "public-token",
        link_type: "public_client",
        show_prices: false,
        allow_order: false,
        allow_payment: false,
        url: "/link/public-token",
      })
      .mockResolvedValueOnce({
        id: 302,
        token: "wholesale-token",
        link_type: "wholesale_buyer",
        show_prices: true,
        allow_order: true,
        allow_payment: true,
        url: "/link/wholesale-token",
      });
  });

  it("groups by sku and filters by suggestion group", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "FIT-101" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "FIT-102" })).toBeInTheDocument();
    expect(screen.getByText("Total do lote")).toBeInTheDocument();
    expect(screen.getAllByText("Em revisao").length).toBeGreaterThan(0);
    expect(screen.getByText("Aprovadas")).toBeInTheDocument();
    expect(screen.getByText("Com erro")).toBeInTheDocument();
    expect(screen.getByText("Confianca media")).toBeInTheDocument();
    expect(screen.getByText("Visiveis")).toBeInTheDocument();
    expect(screen.getByText("Status do lote: Em revisao")).toBeInTheDocument();
    expect(screen.getByText("4 de 4 fotos processadas · 0 com erro")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filtrar grupo"), { target: { value: "pulse_rosa" } });

    await waitFor(() => {
      expect(screen.getByText("Pulse Rosa")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "FIT-101" })).not.toBeInTheDocument();
    });

    expect(screen.getByText("1 foto(s) visiveis")).toBeInTheDocument();
    expect(screen.getByText("Limpar filtros")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Limpar filtros"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "FIT-101" })).toBeInTheDocument();
      expect(screen.queryByText("Limpar filtros")).not.toBeInTheDocument();
    });
  });

  it("selects a whole group and applies suggestions in bulk", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "FIT-101" })).toBeInTheDocument();
    expect(screen.getByText("0 foto(s) selecionada(s)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Selecionar visiveis" }));

    expect(screen.getByText("4 foto(s) selecionada(s)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Desmarcar visiveis" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Selecionar grupo" })[0]);
    expect(screen.getByRole("button", { name: "Limpar selecao" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Aplicar sugestoes/i }));

    await waitFor(() => {
      expect(bulkUpdatePhotos).toHaveBeenCalledWith({
        photo_ids: [1, 2],
        apply_suggestions: true,
        approve: true,
      });
    });
  });

  it("prioritizes low-confidence photos for manual review", async () => {
    renderPage();

    expect(await screen.findByRole("button", { name: "Baixa confianca" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Baixa confianca" }));

    await waitFor(() => {
      expect(screen.getByText("Revisao manual recomendada")).toBeInTheDocument();
      expect(screen.getByText("1 foto(s) visiveis")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "FIT-101" })).not.toBeInTheDocument();
    });
  });

  it("creates a catalog for only the photos in one group", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "FIT-101" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Catalogo do grupo" })[0]);

    await waitFor(() => {
      expect(createCatalog).toHaveBeenCalledWith({
        catalog: {
          name: "Catalogo Lote editorial | FIT-101 | Conjunto Shape Short | Preto | P/M",
          description: "Catalogo gerado a partir da revisao de fotos",
          status: "published",
          source: "photo_batch",
        },
        photo_ids: [1, 2],
      });
    });
  });
});
