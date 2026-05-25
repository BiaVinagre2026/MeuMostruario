import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CatalogLinkPage from "./CatalogLinkPage";

import {
  createSelectionLink,
  createTokenOrder,
  getPublicCatalogLink,
  sendCatalogInterest,
} from "@/lib/api/photoCatalog";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/api/photoCatalog", () => ({
  getPublicCatalogLink: vi.fn(),
  sendCatalogInterest: vi.fn(),
  createSelectionLink: vi.fn(),
  createTokenOrder: vi.fn(),
}));

function renderPage(initialPath = "/link/demo-token") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/link/:token" element={<CatalogLinkPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("CatalogLinkPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });
  });

  it("hides prices and order action for public links", async () => {
    vi.mocked(getPublicCatalogLink).mockResolvedValue({
      id: 1,
      token: "demo-token",
      link_type: "public_client",
      show_prices: false,
      allow_order: false,
      allow_payment: false,
      catalog: { id: 10, name: "Catalogo Cliente", description: "Sem preco" },
      items: [
        {
          id: 101,
          product_id: 55,
          photo_id: 77,
          name: "Vestido Solar",
          image_url: "https://cdn.example.com/vestido.jpg",
          color: "Azul",
          pantone: "19-4052 TPX",
          size_group: "M/G",
          sizes: ["M/G"],
          price: null,
          price_retail: null,
        },
      ],
    });

    renderPage();

    expect(await screen.findByText("Catalogo publico")).toBeInTheDocument();
    expect(screen.getByText("Catalogo Cliente")).toBeInTheDocument();
    expect(screen.getByText("Selecione ao menos uma foto para enviar interesse ou gerar um novo link.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Interesse" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Gerar link" })).toBeDisabled();
    expect(screen.queryByText("Pedido")).not.toBeInTheDocument();
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();

    vi.mocked(sendCatalogInterest).mockResolvedValue({});
    vi.mocked(createSelectionLink).mockResolvedValue({
      catalog_link: {
        id: 77,
        token: "selection-token",
        link_type: "selection",
        show_prices: false,
        allow_order: false,
        allow_payment: false,
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /vestido solar/i }));

    await waitFor(() => {
      expect(screen.getByText("1 foto(s) selecionada(s).")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Interesse" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Gerar link" })).toBeEnabled();
    });
  });

  it("shows prices and submits wholesale orders with size quantities", async () => {
    vi.mocked(getPublicCatalogLink).mockResolvedValue({
      id: 2,
      token: "demo-token",
      link_type: "wholesale_buyer",
      show_prices: true,
      allow_order: true,
      allow_payment: true,
      catalog: { id: 11, name: "Catalogo Atacado", description: "Com pedido" },
      items: [
        {
          id: 202,
          product_id: 88,
          photo_id: 99,
          name: "Biquini Aurora",
          image_url: "https://cdn.example.com/biquini.jpg",
          color: "Verde",
          pantone: "17-5641 TPX",
          size_group: "P/M",
          sizes: ["P/M", "M/G"],
          price: 149.9,
          price_retail: 219.9,
        },
      ],
    });
    vi.mocked(createTokenOrder).mockResolvedValue({});

    renderPage();

    expect(await screen.findByText("Catalogo atacado")).toBeInTheDocument();
    expect(screen.getByText("Catalogo Atacado")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("149,90"))).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /biquini aurora/i }));

    const buyerName = screen.getByPlaceholderText("Nome do comprador");
    const buyerPhone = screen.getByPlaceholderText("WhatsApp");
    fireEvent.change(buyerName, { target: { value: "Loja Mar" } });
    fireEvent.change(buyerPhone, { target: { value: "11999990000" } });

    const sizeInputs = screen.getAllByRole("spinbutton");
    fireEvent.change(sizeInputs[0], { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: /pedido/i }));

    await waitFor(() => {
      expect(createTokenOrder).toHaveBeenCalledWith("demo-token", {
        order: {
          buyer_name: "Loja Mar",
          buyer_phone: "11999990000",
          items: [
            {
              catalog_item_id: 202,
              product_id: 88,
              photo_id: 99,
              product_name: "Biquini Aurora",
              color: "Verde",
              pantone: "17-5641 TPX",
              image_url: "https://cdn.example.com/biquini.jpg",
              price: 149.9,
              qty: { "P/M": 2 },
            },
          ],
          subtotal: 299.8,
          total: 299.8,
          payment_method: "pix",
        },
      });
    });
  });
});
