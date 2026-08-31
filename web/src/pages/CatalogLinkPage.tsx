import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, Loader2, MessageCircle, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";

import { brl } from "@/data/catalog";
import {
  createSelectionLink,
  createTokenOrder,
  getPublicCatalogLink,
  sendCatalogInterest,
} from "@/lib/api/photoCatalog";
import type { TokenOrderResponse } from "@/lib/api/photoCatalog";
import type { PublicCatalogItem } from "@/types/photoCatalog";
import { formatDocumentInput, isValidDocument, onlyDigits as documentDigits } from "@/lib/document";
import { copyToClipboard } from "@/lib/clipboard";
import { useIsMobile } from "@/hooks/useIsMobile";
import { openWhatsapp } from "@/lib/whatsapp";
import { useTenant } from "@/providers/TenantProvider";
import { ModelCarousel, agruparPorModelo, type ModelGroup } from "./catalogLink/ModelCarousel";
import { PhotoViewer } from "./catalogLink/PhotoViewer";
import { radius, rotulo, sombra, t } from "./catalogLink/showcaseTheme";

type QtyMap = Record<number, Record<string, number>>;
const PHONE_MIN_DIGITS = 10;

export default function CatalogLinkPage() {
  const { token = "" } = useParams<{ token: string }>();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [qty, setQty] = useState<QtyMap>({});
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerDocument, setBuyerDocument] = useState("");

  // A barra de acao e fixa e muda de altura conforme o pedido cresce. Sem medir,
  // o espaco reservado no fim da lista erra e as ultimas fotos ficam embaixo
  // dela — no celular isso escondia a linha inteira.
  const footerRef = useRef<HTMLElement>(null);
  const [footerHeight, setFooterHeight] = useState(140);

  // Medido a cada render, antes da pintura: a altura da barra muda junto com o
  // estado que causou o render. So grava quando muda de verdade, senao vira
  // laco infinito.
  useLayoutEffect(() => {
    const altura = footerRef.current?.getBoundingClientRect().height;
    if (altura && Math.abs(altura - footerHeight) > 1) setFooterHeight(altura);
  });

  const [placedOrder, setPlacedOrder] = useState<TokenOrderResponse | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const tenant = useTenant();
  // No celular o pedido vive numa folha que sobe quando o comprador pede, em
  // vez de uma barra permanente comendo um terco da tela.
  const [sheetOpen, setSheetOpen] = useState(false);

  // O painel nasce no topo do documento, mas quem acabou de tocar em "Pedido"
  // esta no fim de uma pagina longa. Sem trazer a tela ate ele, o QR Code do
  // Pix aparece fora da area visivel e o comprador acha que nada aconteceu.
  useLayoutEffect(() => {
    if (placedOrder || generatedLink) {
      painelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [placedOrder, generatedLink]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["catalog-link", token],
    queryFn: () => getPublicCatalogLink(token),
    enabled: token.length > 0,
  });

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const selectedCount = selectedIds.length;
  const orderLines = useMemo(() => {
    if (!data) return [];
    return data.items
      .map((item) => {
        const itemQty = qty[item.id] ?? {};
        const total = Object.values(itemQty).reduce((sum, value) => sum + value, 0);
        return { item, qty: itemQty, total };
      })
      .filter((line) => line.total > 0);
  }, [data, qty]);

  const piecesCount = orderLines.reduce((sum, line) => sum + line.total, 0);
  const total = orderLines.reduce((sum, line) => sum + line.total * Number(line.item.price ?? 0), 0);
  const buyerNameFilled = buyerName.trim().length > 0;
  const buyerPhoneDigits = onlyDigits(buyerPhone);
  const buyerPhoneFilled = buyerPhoneDigits.length >= PHONE_MIN_DIGITS;
  const buyerReadyForContact = buyerNameFilled && buyerPhoneFilled;
  // O documento so e exigido quando o link cobra: e o gateway que o obriga.
  const documentRequired = data?.allow_payment ?? false;
  const buyerDocumentValid = isValidDocument(buyerDocument);
  const buyerDocumentOk = documentRequired ? buyerDocumentValid : true;
  const buyerReadyForOrder = buyerNameFilled && buyerPhoneFilled && buyerDocumentOk;

  const interest = useMutation({
    mutationFn: () => sendCatalogInterest(token, {
      name: buyerName,
      phone: buyerPhoneDigits,
      catalog_item_ids: selectedIds,
      message: "Tenho interesse nessas fotos.",
    }),
    onSuccess: () => {
      toast.success("Interesse enviado.");
      clearSelection();
    },
    onError: () => toast.error("Nao foi possivel enviar o interesse."),
  });

  const selection = useMutation({
    mutationFn: () => createSelectionLink(token, selectedIds),
    onSuccess: (res) => {
      const url = `${window.location.origin}/link/${res.catalog_link.token}`;
      // A copia acontece depois da resposta da rede, fora do gesto do toque:
      // o Safari do iOS recusa, e por http a API de clipboard nem existe. Por
      // isso o link tambem fica visivel na tela, em vez de so prometer que foi
      // copiado.
      setGeneratedLink(url);
      void copyToClipboard(url).then((copiado) => {
        toast.success(copiado ? "Link da selecao copiado." : "Link gerado. Toque para copiar.");
      });
      clearSelection();
    },
    onError: () => toast.error("Nao foi possivel gerar o link."),
  });

  const order = useMutation({
    mutationFn: () => createTokenOrder(token, {
      order: {
        buyer_name: buyerName,
        buyer_phone: buyerPhoneDigits,
        buyer_document: documentDigits(buyerDocument),
        items: orderLines.map(({ item, qty: itemQty }) => ({
          catalog_item_id: item.id,
          product_id: item.product_id,
          photo_id: item.photo_id,
          product_name: item.name,
          color: item.color,
          pantone: item.pantone,
          image_url: item.image_url,
          price: Number(item.price ?? 0),
          qty: itemQty,
        })),
        subtotal: total,
        total,
        payment_method: "pix",
      },
    }),
    onSuccess: (response) => {
      toast.success("Pedido registrado.");
      setPlacedOrder(response);
      clearOrder();
    },
    onError: () => toast.error("Nao foi possivel registrar o pedido."),
  });

  function toggle(itemId: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function setItemQty(itemId: number, size: string, value: number) {
    setQty((current) => ({
      ...current,
      [itemId]: {
        ...(current[itemId] ?? {}),
        [size]: Math.max(0, value),
      },
    }));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function clearOrder() {
    setSelected(new Set());
    setQty({});
  }


  if (isLoading) {
    return <CenteredText>Carregando catalogo...</CenteredText>;
  }

  if (isError || !data) {
    return <CenteredText>Link nao encontrado ou expirado.</CenteredText>;
  }

  if (data.items.length === 0) {
    return <CenteredText>Este catalogo ainda nao possui fotos publicadas.</CenteredText>;
  }

  const publicOnly = !data.show_prices;
  const interestDisabled = selectedCount === 0 || interest.isPending || !buyerReadyForContact;
  const selectionDisabled = selectedCount === 0 || selection.isPending;
  // O servidor confere o minimo de novo com o preco do banco. Aqui e so para o
  // comprador saber antes de montar o pedido inteiro e levar recusa no fim.
  const minOrderAmount = Number(data?.min_order_amount ?? 0);
  const belowMinimum = minOrderAmount > 0 && total < minOrderAmount;
  const orderDisabled = orderLines.length === 0 || order.isPending || !buyerReadyForOrder || belowMinimum;

  return (
    <CatalogShowcase
      data={data}
      publicOnly={publicOnly}
      isMobile={isMobile}
      qty={qty}
      selected={selected}
      orderLines={orderLines}
      piecesCount={piecesCount}
      total={total}
      onQty={setItemQty}
      onToggle={toggle}
      sheetOpen={sheetOpen}
      onOpenSheet={() => setSheetOpen(true)}
      onCloseSheet={() => setSheetOpen(false)}
      buyerName={buyerName}
      buyerPhone={buyerPhone}
      buyerDocument={buyerDocument}
      onBuyerName={setBuyerName}
      onBuyerPhone={(value) => setBuyerPhone(formatPhoneInput(value))}
      onBuyerDocument={(value) => setBuyerDocument(formatDocumentInput(value))}
      documentRequired={documentRequired}
      buyerNameFilled={buyerNameFilled}
      buyerPhoneFilled={buyerPhoneFilled}
      buyerDocumentValid={buyerDocumentValid}
      orderDisabled={orderDisabled}
      interestDisabled={interestDisabled}
      onOrder={() => order.mutate()}
      onInterest={() => interest.mutate()}
      orderPending={order.isPending}
      interestPending={interest.isPending}
      placedOrder={placedOrder}
      onClosePayment={() => setPlacedOrder(null)}
      whatsapp={tenant.social.whatsapp}
      minOrderAmount={minOrderAmount}
      belowMinimum={belowMinimum}
      generatedLink={generatedLink}
      onCloseGeneratedLink={() => setGeneratedLink(null)}
      selectionDisabled={selectionDisabled}
      onSelection={() => selection.mutate()}
      selectionPending={selection.isPending}
    />
  );
}

/**
 * Painel mostrado depois que o pedido e registrado.
 *
 * Cobre os tres desfechos possiveis: cobranca emitida com Pix para pagar,
 * falha na emissao (o pedido existe, a cobranca nao) e pedido sem cobranca,
 * quando o link nao cobra.
 */
function PaymentPanel({ response, onClose, whatsapp }: {
  response: TokenOrderResponse;
  onClose: () => void;
  whatsapp?: string | null;
}) {
  const payment = response.payment;
  const pixCode = payment?.pix_qr_code;
  const failed = payment?.status === "failed";

  function enviarNoWhatsapp() {
    const aberto = openWhatsapp(whatsapp, montarMensagemDoPedido(response));
    if (!aberto) toast.error("A fabrica ainda nao configurou o WhatsApp nas Configuracoes.");
  }

  function copyPix() {
    if (!pixCode) return;
    void copyToClipboard(pixCode).then((copiado) => {
      toast[copiado ? "success" : "error"](
        copiado ? "Codigo Pix copiado." : "Nao foi possivel copiar. Selecione o codigo acima."
      );
    });
  }

  return (
    <section style={{ maxWidth: 1180, margin: "18px auto 0", padding: "0 18px" }}>
      <div style={{ border: "1px solid #d8d0c6", background: "white", padding: 18, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6f665e" }}>
              Pedido #{response.order.id}
            </div>
            <h2 style={{ margin: "4px 0 0", fontSize: 20 }}>
              {failed ? "Pedido registrado, cobranca pendente" : pixCode ? "Pague com Pix" : "Pedido registrado"}
            </h2>
          </div>
          <button type="button" onClick={onClose} style={buttonStyle("ghost")} aria-label="Fechar aviso do pedido">
            <X size={16} />
          </button>
        </div>

        {failed && (
          <p style={{ margin: 0, fontSize: 13, color: "#b04848" }}>
            Seu pedido foi salvo e a fabrica ja consegue ve-lo. So a cobranca nao pode ser emitida agora
            {payment?.error_message ? ` (${payment.error_message})` : ""}. Entre em contato para combinar o pagamento.
          </p>
        )}

        {!failed && pixCode && (
          <>
            {payment?.checkout_url && (
              <img
                src={payment.checkout_url}
                alt="QR Code do Pix"
                style={{ width: 190, height: 190, objectFit: "contain", border: "1px solid #eee6dc", background: "white" }}
              />
            )}
            <div>
              <div style={{ fontSize: 12, color: "#6f665e", marginBottom: 4 }}>Pix copia e cola</div>
              <div
                style={{
                  fontFamily: "monospace", fontSize: 12, wordBreak: "break-all",
                  background: "#faf8f5", border: "1px solid #eee6dc", padding: "8px 10px",
                }}
              >
                {pixCode}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" onClick={copyPix} style={buttonStyle("primary")}>
                <Copy size={16} />
                Copiar codigo
              </button>
              {payment?.pix_expiration && (
                <span style={{ fontSize: 12, color: "#6f665e" }}>
                  Vence em {new Date(payment.pix_expiration).toLocaleString("pt-BR")}
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#6f665e" }}>
              A confirmacao chega automaticamente para a fabrica assim que o banco liquidar o Pix.
            </p>
          </>
        )}

        {!failed && !pixCode && (
          <p style={{ margin: 0, fontSize: 13, color: "#6f665e" }}>
            A fabrica ja recebeu seu pedido e vai combinar o pagamento com voce.
          </p>
        )}

        {/* O envio pelo WhatsApp vem DEPOIS do pedido registrado, nunca no
            lugar dele: se o comprador fechar a aba do WhatsApp, o pedido ja
            esta salvo e visivel para a fabrica. */}
        <button type="button" onClick={enviarNoWhatsapp} style={{ ...buttonStyle("secondary"), justifyContent: "center" }}>
          <MessageCircle size={16} />
          Enviar pedido no WhatsApp
        </button>
      </div>
    </section>
  );
}

/** Mensagem do pedido para a fabrica, com itens, grade e total. */
export function montarMensagemDoPedido(response: TokenOrderResponse): string {
  const { order } = response;
  const linhas = [
    `Pedido #${order.id}`,
    order.buyer_name ? `Comprador: ${order.buyer_name}` : null,
    "",
  ].filter((linha) => linha !== null) as string[];

  (order.items ?? []).forEach((item) => {
    const grade = item.size ? ` (${item.size})` : "";
    linhas.push(`• ${item.qty}x ${item.product_name ?? "Item"}${grade}`);
  });

  linhas.push("", `Total: ${brl(Number(order.total_value ?? 0))}`);

  if (response.payment?.pix_qr_code) {
    linhas.push("", "Pix copia e cola:", response.payment.pix_qr_code);
  }

  return linhas.join("\n");
}

/**
 * Catalogo no celular: uma peca por tela, com rolagem que encaixa.
 *
 * O layout de grade que serve no desktop nao servia aqui — cabecalho fixo em
 * cima e barra de pedido fixa embaixo sobravam menos de um terco da tela para a
 * foto. Aqui o cabecalho rola embora, cada peca ocupa a tela inteira e o pedido
 * mora numa folha que sobe so quando o comprador chama.
 */
/**
 * Vitrine do catalogo — a mesma no celular e no desktop.
 *
 * Antes eram dois layouts: grade no desktop, carrossel no celular. Manter os
 * dois significava corrigir tudo duas vezes. O que muda entre eles agora e
 * so a largura da foto e o formato do painel de pedido.
 */
function CatalogShowcase(props: {
  isMobile: boolean;
  whatsapp?: string | null;
  minOrderAmount: number;
  belowMinimum: boolean;
  generatedLink: string | null;
  onCloseGeneratedLink: () => void;
  selectionDisabled: boolean;
  onSelection: () => void;
  selectionPending: boolean;
  data: PublicCatalogLink;
  publicOnly: boolean;
  qty: QtyMap;
  selected: Set<number>;
  orderLines: Array<{ item: PublicCatalogItem; qty: Record<string, number>; total: number }>;
  piecesCount: number;
  total: number;
  onQty: (itemId: number, size: string, value: number) => void;
  onToggle: (itemId: number) => void;
  sheetOpen: boolean;
  onOpenSheet: () => void;
  onCloseSheet: () => void;
  buyerName: string;
  buyerPhone: string;
  buyerDocument: string;
  onBuyerName: (v: string) => void;
  onBuyerPhone: (v: string) => void;
  onBuyerDocument: (v: string) => void;
  documentRequired: boolean;
  buyerNameFilled: boolean;
  buyerPhoneFilled: boolean;
  buyerDocumentValid: boolean;
  orderDisabled: boolean;
  interestDisabled: boolean;
  onOrder: () => void;
  onInterest: () => void;
  orderPending: boolean;
  interestPending: boolean;
  placedOrder: TokenOrderResponse | null;
  onClosePayment: () => void;
}) {
  const { data, publicOnly, qty, piecesCount, placedOrder, isMobile } = props;
  const temPedido = publicOnly ? props.selected.size > 0 : piecesCount > 0;
  const grupos = useMemo(() => agruparPorModelo(data.items), [data.items]);
  // Qual grupo esta aberto em tela cheia, e em que foto.
  const [visor, setVisor] = useState<{ grupo: ModelGroup; indice: number } | null>(null);
  // No celular a foto ocupa quase a largura toda; no desktop cabem varias, e a
  // proxima aparecendo na borda continua sinalizando que ha mais para o lado.
  const larguraFoto = isMobile ? "82%" : "clamp(240px, 26%, 340px)";

  if (placedOrder) {
    return (
      <main style={{ minHeight: "100dvh", background: t.ground, overflowY: "auto" }}>
        <PaymentPanel response={placedOrder} onClose={props.onClosePayment} whatsapp={props.whatsapp} />
      </main>
    );
  }

  return (
    <>
      <main
        style={{
          minHeight: "100dvh",
          background: t.ground,
          color: t.ink,
          paddingBottom: 96,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          {/* Rola embora junto com o conteudo: nada fixo no topo. */}
          <header style={{ padding: isMobile ? "26px 16px 6px" : "44px 16px 10px" }}>
            <div style={rotulo}>{publicOnly ? "Catálogo" : "Atacado"}</div>
            <h1 style={{
              fontSize: isMobile ? 28 : 44,
              fontWeight: 680, letterSpacing: "-0.03em",
              margin: "8px 0 0", lineHeight: 1.05,
            }}>
              {data.catalog.name}
            </h1>
            {data.catalog.description && (
              <p style={{ fontSize: 15, color: t.inkSoft, margin: "10px 0 0", maxWidth: "60ch" }}>
                {data.catalog.description}
              </p>
            )}
            <p style={{ fontSize: 14, color: t.muted, margin: "8px 0 0" }}>
              {grupos.length} modelo{grupos.length > 1 ? "s" : ""} · {data.items.length} fotos ·
              {isMobile ? " deslize para o lado" : " toque na foto para ampliar"}
            </p>
          </header>

          {grupos.map((grupo) => (
            <ModelCarousel
              key={grupo.chave}
              grupo={grupo}
              showPrices={data.show_prices}
              allowOrder={data.allow_order}
              qty={qty}
              onQty={props.onQty}
              selected={props.selected}
              onToggle={props.onToggle}
              larguraFoto={larguraFoto}
              onAbrirFoto={(indice) => setVisor({ grupo, indice })}
            />
          ))}
        </div>
      </main>

      {visor && (
        <PhotoViewer
          itens={visor.grupo.itens}
          indiceInicial={visor.indice}
          showPrices={data.show_prices}
          allowOrder={data.allow_order}
          qty={qty}
          onQty={props.onQty}
          onFechar={() => setVisor(null)}
        />
      )}

      {props.generatedLink && (
        <GeneratedLinkPanel url={props.generatedLink} onClose={props.onCloseGeneratedLink} />
      )}

      {!props.sheetOpen && temPedido && (
        <CheckoutFab
          publicOnly={publicOnly}
          piecesCount={piecesCount}
          selecionadas={props.selected.size}
          onOpen={props.onOpenSheet}
        />
      )}

      {props.sheetOpen && (
        <CheckoutSheet
          {...props}
          temPedido={temPedido}
        />
      )}
    </>
  );
}

/**
 * Botao redondo no canto, nao uma barra: nao corta a tela nem tampa a ultima
 * foto. Aparece so quando ha o que enviar.
 */
function CheckoutFab({ publicOnly, piecesCount, selecionadas, onOpen }: {
  publicOnly: boolean;
  piecesCount: number;
  selecionadas: number;
  onOpen: () => void;
}) {
  const contagem = publicOnly ? selecionadas : piecesCount;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={publicOnly ? `Enviar interesse de ${contagem} peça(s)` : `Fechar pedido com ${contagem} peça(s)`}
      style={{
        position: "fixed",
        right: 16,
        bottom: "calc(16px + env(safe-area-inset-bottom))",
        zIndex: 30,
        height: 60, minWidth: 60,
        padding: "0 20px",
        display: "inline-flex", alignItems: "center", gap: 10,
        background: t.ink, color: "white",
        border: "none", borderRadius: radius.pilula,
        boxShadow: sombra.flutuante,
        fontSize: 15, fontWeight: 600, cursor: "pointer",
      }}
    >
      <ShoppingBag size={20} />
      <span style={{
        background: t.accent, color: "white",
        minWidth: 24, height: 24, padding: "0 7px",
        borderRadius: radius.pilula,
        display: "grid", placeItems: "center",
        fontSize: 13, fontWeight: 700,
      }}>
        {contagem}
      </span>
    </button>
  );
}

/** Folha que sobe com contato e acoes. Fecha tocando fora ou no X. */
/** Folha no celular, caixa centrada no desktop — mesmo conteudo. */
function CheckoutSheet(props: {
  isMobile: boolean;
  minOrderAmount: number;
  belowMinimum: boolean;
  selectionDisabled: boolean;
  onSelection: () => void;
  selectionPending: boolean;
  publicOnly: boolean;
  temPedido: boolean;
  piecesCount: number;
  total: number;
  data: PublicCatalogLink;
  orderLines: Array<{ item: PublicCatalogItem; qty: Record<string, number>; total: number }>;
  buyerName: string;
  buyerPhone: string;
  buyerDocument: string;
  onBuyerName: (v: string) => void;
  onBuyerPhone: (v: string) => void;
  onBuyerDocument: (v: string) => void;
  documentRequired: boolean;
  buyerNameFilled: boolean;
  buyerPhoneFilled: boolean;
  buyerDocumentValid: boolean;
  orderDisabled: boolean;
  interestDisabled: boolean;
  onOrder: () => void;
  onInterest: () => void;
  orderPending: boolean;
  interestPending: boolean;
  onCloseSheet: () => void;
}) {
  const { publicOnly, data, orderLines, piecesCount, total } = props;
  const faltaAlgo = !props.buyerNameFilled || !props.buyerPhoneFilled
    || (props.documentRequired && !props.buyerDocumentValid);

  return (
    <div
      onClick={props.onCloseSheet}
      style={{
        position: "fixed", inset: 0, zIndex: 40,
        background: "rgba(29,27,24,0.45)",
        display: "flex", alignItems: "flex-end",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%", maxHeight: "88dvh", overflowY: "auto",
          background: "white",
          borderRadius: "16px 16px 0 0",
          padding: `18px 16px calc(18px + env(safe-area-inset-bottom))`,
          display: "grid", gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <strong style={{ fontSize: 17 }}>{publicOnly ? "Enviar interesse" : "Seu pedido"}</strong>
          <button type="button" aria-label="Fechar" onClick={props.onCloseSheet}
            style={{ width: 44, height: 44, border: "none", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <X size={20} />
          </button>
        </div>

        {!publicOnly && orderLines.length > 0 && (
          <div style={{ display: "grid", gap: 8, borderTop: "1px solid #eee6dc", paddingTop: 12 }}>
            {orderLines.map(({ item, qty: linha, total: pecas }) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14 }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 500 }}>{item.name}</span>
                  <span style={{ color: "#6f665e", fontSize: 12 }}>
                    {Object.entries(linha).filter(([, v]) => v > 0).map(([t, v]) => `${t}: ${v}`).join("  ")}
                  </span>
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  {pecas} pc{data.show_prices ? ` · ${brl(pecas * Number(item.price ?? 0))}` : ""}
                </span>
              </div>
            ))}
            {data.show_prices && (
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #eee6dc", paddingTop: 10, fontSize: 16 }}>
                <strong>Total</strong>
                <strong>{brl(total)}</strong>
              </div>
            )}
            <div style={{ fontSize: 12, color: "#6f665e" }}>{piecesCount} peca(s) no total</div>
          </div>
        )}

        <div style={{ display: "grid", gap: 8, borderTop: "1px solid #eee6dc", paddingTop: 12 }}>
          <input
            value={props.buyerName}
            onChange={(event) => props.onBuyerName(event.target.value)}
            placeholder={publicOnly ? "Seu nome" : "Nome do comprador"}
            autoComplete="name"
            style={inputStyle(!props.buyerNameFilled)}
          />
          <input
            value={props.buyerPhone}
            onChange={(event) => props.onBuyerPhone(event.target.value)}
            placeholder="WhatsApp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            style={inputStyle(!props.buyerPhoneFilled)}
          />
          {props.documentRequired && (
            <input
              value={props.buyerDocument}
              onChange={(event) => props.onBuyerDocument(event.target.value)}
              placeholder="CPF ou CNPJ"
              inputMode="numeric"
              aria-label="CPF ou CNPJ"
              style={inputStyle(!props.buyerDocumentValid)}
            />
          )}
          {faltaAlgo && (
            <div style={{ fontSize: 13, color: "#b04848" }}>
              {!props.buyerNameFilled ? "Informe o nome. " : ""}
              {!props.buyerPhoneFilled ? "Use um WhatsApp com DDD. " : ""}
              {props.documentRequired && !props.buyerDocumentValid
                ? (props.buyerDocument.trim() === "" ? "Informe o CPF ou CNPJ." : "CPF ou CNPJ invalido.")
                : ""}
            </div>
          )}
        </div>

        {props.belowMinimum && (
          <div style={{ fontSize: 13, color: t.accent, background: t.accentSoft, borderRadius: 12, padding: "10px 12px" }}>
            Pedido mínimo de {brl(props.minOrderAmount)}. Faltam {brl(props.minOrderAmount - total)}.
          </div>
        )}

        {publicOnly ? (
          <button type="button" disabled={props.interestDisabled} onClick={props.onInterest}
            style={{ ...buttonStyle("primary", props.interestDisabled), width: "100%", minHeight: 50 }}>
            {props.interestPending ? <Loader2 size={18} /> : <MessageCircle size={18} />}
            Enviar interesse
          </button>
        ) : (
          <button type="button" disabled={props.orderDisabled} onClick={props.onOrder}
            style={{ ...buttonStyle("primary", props.orderDisabled), width: "100%", minHeight: 50 }}>
            {props.orderPending ? <Loader2 size={18} /> : <ShoppingBag size={18} />}
            {data.allow_payment ? "Fechar pedido e pagar" : "Enviar pedido"}
          </button>
        )}
      </div>
    </div>
  );
}

function CenteredText({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#faf8f5", color: "#6f665e" }}>
      {children}
    </main>
  );
}

function inputStyle(invalid = false): React.CSSProperties {
  return {
    height: 44,
    fontSize: 16,
    width: "100%",
    minWidth: 0,
    border: `1px solid ${invalid ? "#b04848" : "#d8d0c6"}`,
    padding: "0 10px",
    background: "white",
  };
}

function buttonStyle(variant: "primary" | "secondary" | "ghost", disabled = false): React.CSSProperties {
  if (variant === "ghost") {
    return {
      height: 44,
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      border: "1px solid #d8d0c6",
      background: "#f7f2eb",
      color: "#6f665e",
      padding: "0 12px",
      cursor: "pointer",
    };
  }

  return {
    height: 44,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "1px solid #1d1b18",
    background: variant === "primary" ? (disabled ? "#7d756d" : "#1d1b18") : "white",
    color: variant === "primary" ? "white" : (disabled ? "#8a8178" : "#1d1b18"),
    padding: "0 12px",
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatPhoneInput(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
