import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import MareCoralStorefront from "./MareCoralStorefront";
import { getMareCoralStorefront, updateMareCoralStorefront } from "@/lib/api/mareCoralRetail";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/admin/AdminLayout", () => ({
  AdminLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/lib/api/mareCoralRetail", () => ({
  getMareCoralStorefront: vi.fn(),
  updateMareCoralStorefront: vi.fn(),
}));

const storefront = {
  catalog: { id: 4, name: "Loja Maré Coral", catalog_link_id: 7, selected_count: 2 },
  products: [
    { id: 1, name: "Top Onda", sku: "TOP-1", slug: "top-onda", price_retail: "129.9", cover_url: null, variants_count: 2, stock_qty: 8, selected: true, storefront_position: 0, eligible: true, eligibility_reasons: [] },
    { id: 2, name: "Legging Maré", sku: "LEG-2", slug: "legging-mare", price_retail: "189.9", cover_url: null, variants_count: 3, stock_qty: 10, selected: true, storefront_position: 1, eligible: true, eligibility_reasons: [] },
    { id: 3, name: "Macaquinho Coral", sku: null, slug: "macaquinho-coral", price_retail: null, cover_url: null, variants_count: 0, stock_qty: 0, selected: false, storefront_position: null, eligible: false, eligibility_reasons: ["Informe o preço de varejo", "Cadastre ao menos uma variação com estoque"] },
  ],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}><MareCoralStorefront /></QueryClientProvider>
    </MemoryRouter>
  );
}

describe("MareCoralStorefront", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMareCoralStorefront).mockResolvedValue(storefront);
    vi.mocked(updateMareCoralStorefront).mockResolvedValue(storefront);
  });

  it("mostra pendências e salva os produtos na ordem escolhida", async () => {
    renderPage();

    expect(await screen.findByText("Top Onda")).toBeInTheDocument();
    expect(screen.getByText(/antes de incluir: informe o preço de varejo/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /mostrar macaquinho coral/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Descer Top Onda" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar vitrine" }));

    await waitFor(() => expect(updateMareCoralStorefront).toHaveBeenCalledWith([2, 1]));
  });
});
