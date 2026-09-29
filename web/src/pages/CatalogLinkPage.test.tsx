import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import CatalogLinkPage, { montarMensagemDoPedido } from "./CatalogLinkPage";
import { variaveisDoAcento } from "./catalogLink/showcaseTheme";

import {
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
  catalogLinkPath: (token: string, tenantSlug?: string) => tenantSlug ? `/link/${tenantSlug}/${token}` : `/link/${token}`,
  getPublicCatalogLink: vi.fn(),
  sendCatalogInterest: vi.fn(),
  createSelectionLink: vi.fn(),
  createTokenOrder: vi.fn(),
  createOrderPaymentLink: vi.fn(),
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
          <Route path="/link/:tenantSlug/:token" element={<CatalogLinkPage />} />
          <Route path="/link/:token" element={<CatalogLinkPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const publicLink = {
  id: 1,
  token: "demo-token",
  link_type: "public_client" as const,
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
      size_group: "M/G" as const,
      sizes: ["M/G"] as const,
      price: null,
      price_retail: null,
    },
  ],
};

const wholesaleLink = {
  id: 2,
  token: "demo-token",
  link_type: "wholesale_buyer" as const,
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
      size_group: "P/M" as const,
      sizes: ["P/M", "M/G"] as const,
      price: 149.9,
      price_retail: 219.9,
    },
  ],
};

describe("CatalogLinkPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });
  });

  it("nao expoe preco nem pedido no link publico, e envia interesse pela folha", async () => {
    vi.mocked(getPublicCatalogLink).mockResolvedValue(publicLink);
    vi.mocked(sendCatalogInterest).mockResolvedValue({});

    renderPage();

    expect(await screen.findByText("Catalogo Cliente")).toBeInTheDocument();
    expect(screen.getByText("Vestido Solar")).toBeInTheDocument();
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Pedido$/i })).not.toBeInTheDocument();

    // Sem nada escolhido nao ha o que enviar, entao nem o botao de fechar existe.
    expect(screen.queryByRole("button", { name: /Enviar interesse de/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tenho interesse" }));

    const fab = await screen.findByRole("button", { name: /Enviar interesse de 1/ });
    fireEvent.click(fab);

    fireEvent.change(await screen.findByPlaceholderText("Seu nome"), { target: { value: "Cliente Final" } });
    fireEvent.change(screen.getByPlaceholderText("WhatsApp"), { target: { value: "(11) 99999-0000" } });

    const enviar = screen.getByRole("button", { name: "Enviar interesse" });
    await waitFor(() => expect(enviar).toBeEnabled());
    fireEvent.click(enviar);

    await waitFor(() => {
      expect(sendCatalogInterest).toHaveBeenCalledWith("demo-token", {
        name: "Cliente Final",
        phone: "11999990000",
        catalog_item_ids: [101],
        message: "Tenho interesse nessas fotos.",
      }, undefined);
    });
  });

  it("agrupa as fotos por modelo e abre a foto em tela cheia", async () => {
    vi.mocked(getPublicCatalogLink).mockResolvedValue({
      ...publicLink,
      items: [
        publicLink.items[0],
        { ...publicLink.items[0], id: 102, color: "Preto" },
      ],
    });

    renderPage();

    // Duas fotos do mesmo modelo viram um grupo so, nao dois cartoes soltos.
    const titulo = await screen.findByRole("heading", { name: "Vestido Solar" });
    expect(titulo).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Abrir foto \d de Vestido Solar/ })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Abrir foto 1 de Vestido Solar" }));

    const visor = await screen.findByRole("dialog");
    expect(visor).toHaveAttribute("aria-label", expect.stringContaining("foto 1 de 2"));

    // Escopado ao visor: o carrossel da tela tambem tem seta com esse rotulo.
    fireEvent.click(within(visor).getByRole("button", { name: "Próxima foto" }));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", expect.stringContaining("foto 2 de 2"));
    });

    fireEvent.click(screen.getByRole("button", { name: "Fechar foto" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("mostra preco, exige documento e envia o pedido do atacado", async () => {
    vi.mocked(getPublicCatalogLink).mockResolvedValue(wholesaleLink);
    vi.mocked(createTokenOrder).mockResolvedValue({
      order: { id: 42, status: "pending", payment_status: "pending", total_value: 299.8 },
      payment: null,
    });

    renderPage();

    expect(await screen.findByText("Catalogo Atacado")).toBeInTheDocument();
    expect(screen.getByText((texto) => texto.includes("149,90"))).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Somar uma peça do tamanho P/M" }));
    fireEvent.click(screen.getByRole("button", { name: "Somar uma peça do tamanho P/M" }));

    fireEvent.click(await screen.findByRole("button", { name: /Fechar pedido com 2/ }));

    fireEvent.change(await screen.findByPlaceholderText("Nome do comprador"), { target: { value: "Loja Mar" } });
    fireEvent.change(screen.getByPlaceholderText("WhatsApp"), { target: { value: "11999990000" } });

    const enviar = screen.getByRole("button", { name: /Fechar pedido e pagar/ });
    // O link cobra, entao sem documento valido o pedido nao sai.
    expect(enviar).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("CPF ou CNPJ"), { target: { value: "529.982.247-24" } });
    expect(enviar).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("CPF ou CNPJ"), { target: { value: "11222333000181" } });
    await waitFor(() => expect(enviar).toBeEnabled());

    fireEvent.click(enviar);

    await waitFor(() => {
      expect(createTokenOrder).toHaveBeenCalledWith("demo-token", expect.objectContaining({
        order: expect.objectContaining({
          buyer_name: "Loja Mar",
          buyer_phone: "11999990000",
          buyer_document: "11222333000181",
        }),
      }), undefined);
    });

    // O valor nao sai daqui: quem soma e o servidor, pelo preco do banco.
    // Mandar total do navegador foi o que permitiu fechar R$ 318 por R$ 1,00.
    const enviado = vi.mocked(createTokenOrder).mock.calls[0][1] as { order: Record<string, unknown> };
    expect(enviado.order).not.toHaveProperty("total");
    expect(enviado.order).not.toHaveProperty("subtotal");
    expect(enviado.order).not.toHaveProperty("discount");
  });

  it("avisa que a cobranca falhou sem esconder que o pedido foi salvo", async () => {
    vi.mocked(getPublicCatalogLink).mockResolvedValue(wholesaleLink);
    vi.mocked(createTokenOrder).mockResolvedValue({
      order: { id: 43, status: "pending", payment_status: "failed", total_value: 149.9 },
      payment: {
        id: 8,
        status: "failed",
        payment_method: "pix",
        amount: 149.9,
        error_message: "gateway respondeu 422: customer_document invalido",
      },
    });

    renderPage();

    expect(await screen.findByText("Catalogo Atacado")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Somar uma peça do tamanho P/M" }));
    fireEvent.click(await screen.findByRole("button", { name: /Fechar pedido com 1/ }));

    fireEvent.change(await screen.findByPlaceholderText("Nome do comprador"), { target: { value: "Loja Mar" } });
    fireEvent.change(screen.getByPlaceholderText("WhatsApp"), { target: { value: "11999990000" } });
    fireEvent.change(screen.getByPlaceholderText("CPF ou CNPJ"), { target: { value: "11222333000181" } });

    fireEvent.click(screen.getByRole("button", { name: /Fechar pedido e pagar/ }));

    expect(await screen.findByText("Pedido registrado, cobranca pendente")).toBeInTheDocument();
    expect(screen.getByText(/Seu pedido foi salvo/)).toBeInTheDocument();
    expect(screen.getByText(/customer_document invalido/)).toBeInTheDocument();
    expect(screen.queryByText("Pague com Pix")).not.toBeInTheDocument();
  });

  it("leva o tenant da URL para a leitura do link compartilhado", async () => {
    vi.mocked(getPublicCatalogLink).mockResolvedValue(publicLink);

    renderPage("/link/mare-coral/demo-token");

    expect(await screen.findByText("Catalogo Cliente")).toBeInTheDocument();
    expect(getPublicCatalogLink).toHaveBeenCalledWith("demo-token", "mare-coral");
  });
});

describe("variaveisDoAcento", () => {
  it("usa a cor do tenant e escreve em branco sobre cor escura", () => {
    const vars = variaveisDoAcento("#1B3A6B") as Record<string, string>;

    expect(vars["--cat-acento"]).toBe("rgb(27, 58, 107)");
    expect(vars["--cat-acento-texto"]).toBe("#FFFFFF");
  });

  it("escreve em preto sobre cor clara, para o rotulo nao sumir", () => {
    // Um tenant de marca amarela deixaria "3 pç" ilegivel em branco.
    const vars = variaveisDoAcento("#FFD54F") as Record<string, string>;

    expect(vars["--cat-acento-texto"]).toBe("#17161B");
  });

  it("aceita a forma curta e ignora valor invalido, mantendo a reserva", () => {
    expect((variaveisDoAcento("#0AF") as Record<string, string>)["--cat-acento"]).toBe("rgb(0, 170, 255)");
    // Sem variavel definida, o var() do tema cai no valor de reserva.
    expect(variaveisDoAcento("azul")).toEqual({});
    expect(variaveisDoAcento(null)).toEqual({});
  });
});

describe("montarMensagemDoPedido", () => {
  const resposta = {
    order: { id: 42, status: "pending", payment_status: "pending", total_value: 299.8, buyer_name: "Loja Mar" },
    payment: {
      id: 8,
      status: "pending",
      payment_method: "pix",
      amount: 299.8,
      pix_qr_code: "00020126580014BR.GOV.BCB.PIX0136".padEnd(240, "0"),
    },
  };

  const linhas = [
    {
      item: wholesaleLink.items[0],
      qty: { "P/M": 2 },
      total: 2,
    },
  ];

  function comHost(host: string, executar: () => string): string {
    const original = window.location;
    Object.defineProperty(window, "location", {
      value: { ...original, hostname: host, origin: `http://${host}:3000` },
      writable: true,
      configurable: true,
    });
    try {
      return executar();
    } finally {
      Object.defineProperty(window, "location", { value: original, writable: true, configurable: true });
    }
  }

  it("resume o item em modelo, Pantone, grade e valor", () => {
    const texto = comHost("192.168.0.233", () => montarMensagemDoPedido(resposta, linhas));

    expect(texto).toContain("*Biquini Aurora*");
    expect(texto).toContain("Verde · 17-5641 TPX");
    // O brl() separa o R$ do numero com espaco nao-quebravel, nao com espaco comum.
    expect(texto).toMatch(/P\/M: 2 — R\$\s299,80/);
    expect(texto).toMatch(/\*Total: R\$\s299,80\*/);
    // O codigo Pix inteiro enterrava o pedido no meio do texto.
    expect(texto).not.toContain("BR.GOV.BCB.PIX");
    expect(texto).toContain("Pix emitido no site.");
  });

  it("omite a foto em rede local e a inclui num endereco publico", () => {
    // Endereco de rede interna nao abre no celular da loja: viraria texto
    // solto, sem miniatura nenhuma.
    const local = comHost("192.168.0.233", () => montarMensagemDoPedido(resposta, linhas));
    expect(local).not.toContain("cdn.example.com");
    expect(local.startsWith("*Pedido #42*")).toBe(true);

    const publico = comHost("catalogo.befit.com.br", () => montarMensagemDoPedido(resposta, linhas));
    expect(publico.startsWith("https://cdn.example.com/biquini.jpg")).toBe(true);
  });
});
