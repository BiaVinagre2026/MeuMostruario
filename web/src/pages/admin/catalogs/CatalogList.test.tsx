import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import CatalogList from "./CatalogList";
import {
  deleteCatalog,
  deleteCatalogLink,
  getCatalogs,
  revokeCatalogLink,
  updateCatalog,
} from "@/lib/api/photoCatalog";

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
  createCatalogLink: vi.fn(),
  getCatalogs: vi.fn(),
  updateCatalog: vi.fn(),
  deleteCatalog: vi.fn(),
  revokeCatalogLink: vi.fn(),
  deleteCatalogLink: vi.fn(),
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
      <CatalogList />
    </QueryClientProvider>
  );
}

describe("CatalogList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateCatalog).mockResolvedValue({
      id: 2,
      name: "Catalogo FIT-103 | Conjunto Pulse Legging Plus | Vinho Intenso | Plus 1",
      description: "Catalogo plus",
      status: "published",
      source: "photo_batch_group",
      items_count: 6,
      summary: {
        sku_labels: ["FIT-103"],
        model_labels: ["Conjunto Pulse Legging Plus"],
        color_labels: ["Vinho Intenso"],
        size_groups: ["Plus 1"],
        public_links_count: 0,
        wholesale_links_count: 1,
      },
      links: [],
      created_at: "2026-05-22T11:00:00Z",
      updated_at: "2026-05-22T11:05:00Z",
    });
    vi.mocked(getCatalogs).mockResolvedValue([
      {
        id: 1,
        name: "Catalogo FIT-101 | Conjunto Shape Short | Preto | P/M",
        description: "Catalogo gerado a partir da revisao de fotos",
        status: "published",
        source: "photo_batch",
        items_count: 10,
        summary: {
          sku_labels: ["FIT-101"],
          model_labels: ["Conjunto Shape Short"],
          color_labels: ["Preto"],
          size_groups: ["P/M"],
          public_links_count: 1,
          wholesale_links_count: 1,
        },
        links: [],
        created_at: "2026-05-22T10:00:00Z",
        updated_at: "2026-05-22T10:05:00Z",
      },
      {
        id: 2,
        name: "Catalogo FIT-103 | Conjunto Pulse Legging Plus | Vinho Intenso | Plus 1",
        description: "Catalogo plus",
        status: "draft",
        source: "photo_batch_group",
        items_count: 6,
        summary: {
          sku_labels: ["FIT-103"],
          model_labels: ["Conjunto Pulse Legging Plus"],
          color_labels: ["Vinho Intenso"],
          size_groups: ["Plus 1"],
          public_links_count: 0,
          wholesale_links_count: 1,
        },
        links: [
          {
            id: 9,
            token: "wholesale-9",
            link_type: "wholesale_buyer",
            show_prices: true,
            allow_order: true,
            allow_payment: true,
          },
        ],
        created_at: "2026-05-22T11:00:00Z",
        updated_at: "2026-05-22T11:05:00Z",
      },
    ]);
  });

  it("shows operational summary chips for each catalog", async () => {
    renderPage();

    expect(await screen.findByText("Catalogos")).toBeInTheDocument();
    expect(screen.getByText("Publicados")).toBeInTheDocument();
    expect(screen.getByText("Rascunhos")).toBeInTheDocument();
    expect(screen.getByText("Links atacado")).toBeInTheDocument();

    const title = await screen.findByText("Catalogo FIT-101 | Conjunto Shape Short | Preto | P/M");
    const card = title.closest("section");
    expect(card).not.toBeNull();
    const scope = within(card as HTMLElement);

    expect(scope.getByText("FIT-101")).toBeInTheDocument();
    expect(scope.getByText("Conjunto Shape Short")).toBeInTheDocument();
    expect(scope.getByText("Preto")).toBeInTheDocument();
    expect(scope.getByText("P/M")).toBeInTheDocument();
    expect(scope.getByText("1 link(s) publico(s) · 1 link(s) atacado")).toBeInTheDocument();
  });

  it("renders richer metadata and actions for existing links", async () => {
    renderPage();

    const title = await screen.findByText("Catalogo FIT-103 | Conjunto Pulse Legging Plus | Vinho Intenso | Plus 1");
    const card = title.closest("section");
    expect(card).not.toBeNull();
    const scope = within(card as HTMLElement);

    expect(scope.getByText("Atacado · com preco · pedido · pagamento")).toBeInTheDocument();
    expect(scope.getByRole("link", { name: "Abrir" })).toHaveAttribute("href", `${window.location.origin}/link/wholesale-9`);
    expect(scope.getByRole("button", { name: "Copiar" })).toBeInTheDocument();
  });

  it("filters catalogs by sku, status and link type", async () => {
    renderPage();

    expect(await screen.findByText("Catalogo FIT-101 | Conjunto Shape Short | Preto | P/M")).toBeInTheDocument();
    expect(screen.getByText("Catalogo FIT-103 | Conjunto Pulse Legging Plus | Vinho Intenso | Plus 1")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filtrar SKU"), { target: { value: "FIT-103" } });
    fireEvent.change(screen.getByLabelText("Filtrar status"), { target: { value: "draft" } });
    fireEvent.change(screen.getByLabelText("Filtrar tipo de link"), { target: { value: "wholesale_buyer" } });

    await waitFor(() => {
      expect(screen.getByText("Catalogo FIT-103 | Conjunto Pulse Legging Plus | Vinho Intenso | Plus 1")).toBeInTheDocument();
      expect(screen.queryByText("Catalogo FIT-101 | Conjunto Shape Short | Preto | P/M")).not.toBeInTheDocument();
      expect(screen.getByText("1 catalogo(s)")).toBeInTheDocument();
    });
  });

  it("searches, sorts and clears filters", async () => {
    renderPage();

    expect(await screen.findByText("Catalogo FIT-101 | Conjunto Shape Short | Preto | P/M")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar catalogos"), { target: { value: "plus" } });

    await waitFor(() => {
      expect(screen.getByText("Catalogo FIT-103 | Conjunto Pulse Legging Plus | Vinho Intenso | Plus 1")).toBeInTheDocument();
      expect(screen.queryByText("Catalogo FIT-101 | Conjunto Shape Short | Preto | P/M")).not.toBeInTheDocument();
      expect(screen.getByText("Limpar filtros")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Ordenar catalogos"), { target: { value: "items_desc" } });
    fireEvent.click(screen.getByText("Limpar filtros"));

    await waitFor(() => {
      expect(screen.getByText("Catalogo FIT-101 | Conjunto Shape Short | Preto | P/M")).toBeInTheDocument();
      expect(screen.getByText("Catalogo FIT-103 | Conjunto Pulse Legging Plus | Vinho Intenso | Plus 1")).toBeInTheDocument();
      expect(screen.queryByText("Limpar filtros")).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("Mais recentes")).toBeInTheDocument();
      expect(screen.getByText("2 catalogo(s)")).toBeInTheDocument();
    });
  });

  it("updates catalog status from the list actions", async () => {
    renderPage();

    expect(await screen.findByText("Catalogo FIT-103 | Conjunto Pulse Legging Plus | Vinho Intenso | Plus 1")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Publicar"));

    await waitFor(() => {
      expect(updateCatalog).toHaveBeenCalledWith(2, {
        catalog: {
          name: "Catalogo FIT-103 | Conjunto Pulse Legging Plus | Vinho Intenso | Plus 1",
          description: "Catalogo plus",
          source: "photo_batch_group",
          status: "published",
        },
      });
    });
  });

  it("edita nome e descricao pelo formulario inline", async () => {
    renderPage();

    const title = await screen.findByText("Catalogo FIT-101 | Conjunto Shape Short | Preto | P/M");
    const scope = within(title.closest("section") as HTMLElement);

    fireEvent.click(scope.getByRole("button", { name: /Editar/ }));

    const nameInput = scope.getByLabelText("Nome do catalogo");
    expect((nameInput as HTMLInputElement).value).toBe("Catalogo FIT-101 | Conjunto Shape Short | Preto | P/M");

    fireEvent.change(nameInput, { target: { value: "Verao 26 | Atacado" } });
    fireEvent.change(scope.getByLabelText("Descricao do catalogo"), { target: { value: "Selecao da fabrica" } });
    fireEvent.click(scope.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(updateCatalog).toHaveBeenCalledWith(1, {
        catalog: { name: "Verao 26 | Atacado", description: "Selecao da fabrica" },
      });
    });
  });

  it("exige confirmacao antes de excluir o catalogo", async () => {
    vi.mocked(deleteCatalog).mockResolvedValue();
    renderPage();

    const title = await screen.findByText("Catalogo FIT-101 | Conjunto Shape Short | Preto | P/M");
    const scope = within(title.closest("section") as HTMLElement);

    fireEvent.click(scope.getByRole("button", { name: /Excluir/ }));
    expect(deleteCatalog).not.toHaveBeenCalled();
    expect(scope.getByText("Excluir mesmo?")).toBeInTheDocument();

    fireEvent.click(scope.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(deleteCatalog).toHaveBeenCalledWith(1));
  });

  it("revoga e exclui link, passando o catalogo dono", async () => {
    vi.mocked(revokeCatalogLink).mockResolvedValue({
      id: 9,
      token: "wholesale-9",
      link_type: "wholesale_buyer",
      show_prices: true,
      allow_order: true,
      allow_payment: true,
      expires_at: "2026-01-01T00:00:00Z",
    });
    vi.mocked(deleteCatalogLink).mockResolvedValue();
    renderPage();

    const title = await screen.findByText("Catalogo FIT-103 | Conjunto Pulse Legging Plus | Vinho Intenso | Plus 1");
    const scope = within(title.closest("section") as HTMLElement);

    fireEvent.click(scope.getByRole("button", { name: "Revogar" }));
    await waitFor(() => {
      expect(revokeCatalogLink).toHaveBeenCalledWith(2, 9);
    });

    fireEvent.click(scope.getByRole("button", { name: "Excluir link wholesale-9" }));
    await waitFor(() => {
      expect(deleteCatalogLink).toHaveBeenCalledWith(2, 9);
    });
  });

  it("marca como revogado o link ja expirado e esconde a acao de revogar", async () => {
    vi.mocked(getCatalogs).mockResolvedValue([
      {
        id: 3,
        name: "Catalogo Encerrado",
        description: null,
        status: "archived",
        source: "admin",
        items_count: 2,
        links: [
          {
            id: 11,
            token: "expirado-11",
            link_type: "public_client",
            show_prices: false,
            allow_order: false,
            allow_payment: false,
            expires_at: "2020-01-01T00:00:00Z",
          },
        ],
        created_at: "2026-05-22T11:00:00Z",
        updated_at: "2026-05-22T11:05:00Z",
      },
    ]);

    renderPage();

    const title = await screen.findByText("Catalogo Encerrado");
    const scope = within(title.closest("section") as HTMLElement);

    expect(scope.getByText(/revogado/)).toBeInTheDocument();
    expect(scope.queryByRole("button", { name: "Revogar" })).not.toBeInTheDocument();
  });
});
