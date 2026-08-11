import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import BrandingSettings from "./BrandingSettings";
import { updateAdminConfig, type AdminConfig } from "@/lib/api/config";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api/config", () => ({
  updateAdminConfig: vi.fn(),
}));

vi.mock("@/lib/api/uploads", () => ({
  uploadAsset: vi.fn(),
}));

const config = {
  tenant_name: "Meu Mostruario",
  color_primary: "#1E40AF",
  color_secondary: "#F97316",
  company_name: "Confeccoes Demo",
  social_whatsapp: "+55 11 90000-0000",
  announcement_bar_text: "Pedido minimo de 6 pecas",
} as AdminConfig;

function renderPage(overrides: Partial<AdminConfig> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrandingSettings config={{ ...config, ...overrides }} />
    </QueryClientProvider>
  );
}

describe("BrandingSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateAdminConfig).mockResolvedValue(config);
  });

  it("carrega os valores do tenant e envia as alteracoes", async () => {
    renderPage();

    const primary = screen.getByLabelText("Primária") as HTMLInputElement;
    expect(primary.value).toBe("#1E40AF");
    expect((screen.getByLabelText("Razão social") as HTMLInputElement).value).toBe("Confeccoes Demo");

    fireEvent.change(primary, { target: { value: "#7A2036" } });
    fireEvent.change(screen.getByLabelText("Razão social"), { target: { value: "Aurora Ltda" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(updateAdminConfig).toHaveBeenCalled());

    const payload = vi.mocked(updateAdminConfig).mock.calls[0][0];
    expect(payload.color_primary).toBe("#7A2036");
    expect(payload.company_name).toBe("Aurora Ltda");
  });

  it("envia null quando um campo e esvaziado, para limpar o valor no tenant", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Barra de aviso"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(updateAdminConfig).toHaveBeenCalled());
    expect(vi.mocked(updateAdminConfig).mock.calls[0][0].announcement_bar_text).toBeNull();
  });

  it("bloqueia o salvamento enquanto houver cor fora do formato hexadecimal", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Primária"), { target: { value: "azul" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    });
    expect(screen.getByText(/Use cores no formato #RRGGBB/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Primária"), { target: { value: "#123ABC" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
    });
  });

  it("mostra a barra de aviso e o nome da empresa na previa", () => {
    renderPage();

    expect(screen.getByText("Pedido minimo de 6 pecas")).toBeInTheDocument();
    expect(screen.getByText("Confeccoes Demo")).toBeInTheDocument();
  });
});
