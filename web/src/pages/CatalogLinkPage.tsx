import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, Loader2, MessageCircle, ShoppingBag, X } from "lucide-react";
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
  const allSelected = data ? selectedCount === data.items.length && data.items.length > 0 : false;
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
  const showContactValidation = selectedCount > 0 || orderLines.length > 0;

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

  function selectAllItems() {
    if (!data) return;
    setSelected(new Set(data.items.map((item) => item.id)));
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
  const orderDisabled = orderLines.length === 0 || order.isPending || !buyerReadyForOrder;
  const actionHint = publicOnly
    ? (!buyerReadyForContact
      ? "Preencha seu nome e WhatsApp para enviar interesse. O link da selecao pode ser gerado mesmo sem contato."
      : (selectedCount === 0 ? "Selecione ao menos uma foto para enviar interesse ou gerar um novo link." : `${selectedCount} foto(s) selecionada(s).`))
    : (!buyerReadyForOrder
      ? (documentRequired
        ? "Preencha nome, WhatsApp e CPF ou CNPJ do comprador para liberar o pedido."
        : "Preencha nome e WhatsApp do comprador para liberar o pedido.")
      // No atacado o que conta e o item com quantidade, nao o card marcado: da
      // para digitar a grade sem clicar na foto, e antes isso aparecia como
      // "0 foto(s) selecionada(s)" ao lado de um pedido cheio.
      : (orderLines.length === 0 ? "Selecione fotos e informe as quantidades por tamanho para registrar o pedido." : `${orderLines.length} modelo(s) no pedido · ${piecesCount} peca(s).`));

  if (isMobile) {
    return (
      <MobileCatalog
        data={data}
        publicOnly={publicOnly}
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
      />
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#faf8f5", color: "#1d1b18" }}>
      <header style={{ padding: "22px 18px", borderBottom: "1px solid #e5ded4", background: "white", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "#8a7f73" }}>
              {publicOnly ? "Catalogo publico" : "Catalogo atacado"}
            </div>
            <h1 style={{ fontSize: 24, margin: "4px 0 0", lineHeight: 1.1 }}>{data.catalog.name}</h1>
            {data.catalog.description && (
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "#6f665e", maxWidth: 560 }}>{data.catalog.description}</p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button type="button" onClick={allSelected ? (publicOnly ? clearSelection : clearOrder) : selectAllItems} style={buttonStyle("ghost")}>
                {allSelected ? <X size={16} /> : null}
                {allSelected ? "Desmarcar todas" : "Selecionar todas"}
              </button>
              {selectedCount > 0 && !allSelected && (
                <button type="button" onClick={publicOnly ? clearSelection : clearOrder} style={buttonStyle("ghost")}>
                  <X size={16} />
                  {publicOnly ? "Limpar selecao" : "Limpar pedido"}
                </button>
              )}
            </div>
          </div>
          <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
            <div style={{ fontSize: 13, color: "#6f665e" }}>{data.items.length} fotos</div>
            {(selectedCount > 0 || piecesCount > 0) && (
              <div style={{ fontSize: 12, color: "#6f665e" }}>
                {selectedCount > 0 ? `${selectedCount} selecionada(s)` : ""}
                {selectedCount > 0 && piecesCount > 0 ? " · " : ""}
                {piecesCount > 0 ? `${piecesCount} peca(s)` : ""}
              </div>
            )}
          </div>
        </div>
      </header>

      {generatedLink && (
        <div ref={painelRef} style={{ maxWidth: 1180, margin: "16px auto 0", padding: "0 18px" }}>
          <div style={{ border: "1px solid #d8d0c6", background: "white", padding: 14, display: "grid", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Link da selecao</div>
            <input
              readOnly
              value={generatedLink}
              aria-label="Link da selecao"
              onFocus={(event) => event.target.select()}
              style={{ ...inputStyle(), fontSize: 14 }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  void copyToClipboard(generatedLink).then((copiado) => {
                    toast[copiado ? "success" : "error"](copiado ? "Copiado." : "Copie manualmente do campo acima.");
                  });
                }}
                style={buttonStyle("secondary")}
              >
                <Copy size={16} />
                Copiar
              </button>
              <button type="button" onClick={() => setGeneratedLink(null)} style={buttonStyle("ghost")}>
                <X size={16} />
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {placedOrder && (
        <div ref={painelRef}>
          <PaymentPanel response={placedOrder} onClose={() => setPlacedOrder(null)} />
        </div>
      )}

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: `22px 18px ${footerHeight + 24}px` }}>
        {/* 140px cabe em duas colunas num celular de 360px; com 180px sobrava
            uma foto por linha, gigante, e o comprador rolava o catalogo inteiro
            por uma fresta. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
          {data.items.map((item) => (
            <CatalogCard
              key={item.id}
              item={item}
              showPrices={data.show_prices}
              allowOrder={data.allow_order}
              selected={selected.has(item.id)}
              qty={qty[item.id] ?? {}}
              onToggle={() => toggle(item.id)}
              onQty={(size, value) => setItemQty(item.id, size, value)}
            />
          ))}
        </div>
      </section>

      <footer ref={footerRef} style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        background: "white",
        borderTop: "1px solid #e5ded4",
        // A faixa do indicador de gesto do iPhone come os ultimos ~34px.
        padding: "12px 18px calc(12px + env(safe-area-inset-bottom))",
        zIndex: 20,
      }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, alignItems: "center" }}>
          <div style={{ display: "grid", gap: 8 }}>
            {/* Os campos de contato so aparecem quando ha o que enviar. No
                celular a barra ficava com 31% da tela justamente enquanto o
                comprador ainda estava rolando as fotos e nao precisava deles. */}
            {showContactValidation && (
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                <input
                  value={buyerName}
                  onChange={(event) => setBuyerName(event.target.value)}
                  placeholder={publicOnly ? "Seu nome" : "Nome do comprador"}
                  autoComplete="name"
                  style={inputStyle(!buyerNameFilled)}
                />
                <input
                  value={buyerPhone}
                  onChange={(event) => setBuyerPhone(formatPhoneInput(event.target.value))}
                  placeholder="WhatsApp"
                  // Sem type/inputMode o celular abre o teclado de letras para
                  // digitar telefone — e e esse campo que destrava o pedido.
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  style={inputStyle(!buyerPhoneFilled)}
                />
                {documentRequired && (
                  <input
                    value={buyerDocument}
                    onChange={(event) => setBuyerDocument(formatDocumentInput(event.target.value))}
                    placeholder="CPF ou CNPJ"
                    inputMode="numeric"
                    aria-label="CPF ou CNPJ"
                    style={inputStyle(!buyerDocumentValid)}
                  />
                )}
              </div>
            )}
            {showContactValidation && (!buyerNameFilled || !buyerPhoneFilled || (documentRequired && !buyerDocumentValid)) && (
              <div style={{ fontSize: 12, color: "#b04848" }}>
                {!buyerNameFilled ? "Informe o nome. " : ""}
                {!buyerPhoneFilled ? "Use um WhatsApp com DDD para continuar. " : ""}
                {documentRequired && !buyerDocumentValid
                  ? (buyerDocument.trim() === ""
                    ? "Informe o CPF ou CNPJ para pagar."
                    : "CPF ou CNPJ invalido.")
                  : ""}
              </div>
            )}
            <div style={{ fontSize: 12, color: "#6f665e" }}>{actionHint}</div>
            {!publicOnly && orderLines.length > 0 && (
              <div style={{ fontSize: 12, color: "#6f665e" }}>
                Total estimado: <strong style={{ color: "#1d1b18" }}>{brl(total)}</strong>
              </div>
            )}
          </div>
          <div style={{ display: "grid", gap: 8, alignItems: "center", gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))" }}>
            {data.show_prices && <strong>{brl(total)}</strong>}
            {/* Interesse so faz sentido no link publico, onde e a unica acao
                possivel. No atacado ele ficava travado para sempre: dependia de
                clicar no card, e ali o comprador so digita quantidade. */}
            {publicOnly && (
              <button
                type="button"
                disabled={interestDisabled}
                aria-disabled={interestDisabled}
                onClick={() => interest.mutate()}
                style={buttonStyle("secondary", interestDisabled)}
              >
                {interest.isPending ? <Loader2 size={16} /> : <MessageCircle size={16} />}
                Interesse
              </button>
            )}
            <button
              type="button"
              disabled={selectionDisabled}
              aria-disabled={selectionDisabled}
              onClick={() => selection.mutate()}
              style={buttonStyle("secondary", selectionDisabled)}
            >
              {selection.isPending ? <Loader2 size={16} /> : <Copy size={16} />}
              Gerar link
            </button>
            {data.allow_order && (
              <button
                type="button"
                disabled={orderDisabled}
                aria-disabled={orderDisabled}
                onClick={() => order.mutate()}
                style={buttonStyle("primary", orderDisabled)}
              >
                {order.isPending ? <Loader2 size={16} /> : <ShoppingBag size={16} />}
                Pedido
              </button>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}

function CatalogCard({
  item,
  showPrices,
  allowOrder,
  selected,
  qty,
  onToggle,
  onQty,
}: {
  item: PublicCatalogItem;
  showPrices: boolean;
  allowOrder: boolean;
  selected: boolean;
  qty: Record<string, number>;
  onToggle: () => void;
  onQty: (size: string, value: number) => void;
}) {
  return (
    <article style={{ background: "white", border: selected ? "2px solid #1d1b18" : "1px solid #e5ded4" }}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onToggle}
        style={{ display: "block", width: "100%", textAlign: "left", position: "relative", cursor: "pointer" }}
      >
        <div style={{ aspectRatio: "3 / 4", background: "#eee8df", overflow: "hidden" }}>
          {/* O backend ainda serve a foto original nos quatro tamanhos, entao
              um catalogo grande baixa dezenas de MB no 4G. Ate existirem as
              variantes, carregar sob demanda e o que salva o comprador. */}
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.name}
              loading="lazy"
              decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
            />
          )}
        </div>
        {selected && (
          <span style={{ position: "absolute", top: 8, right: 8, background: "#1d1b18", color: "white", borderRadius: 999, width: 24, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={15} />
          </span>
        )}
      </button>
      <div style={{ padding: 12, display: "grid", gap: 7 }}>
        <strong style={{ fontSize: 14 }}>{item.name}</strong>
        <div style={{ fontSize: 12, color: "#6f665e" }}>
          {[item.color, item.pantone, item.size_group].filter(Boolean).join(" · ") || "Sem classificacao"}
        </div>
        {selected && (
          <div style={{ fontSize: 12, color: "#1d1b18", fontWeight: 600 }}>
            Selecionada
          </div>
        )}
        {showPrices && <div style={{ fontWeight: 700 }}>{brl(Number(item.price ?? 0))}</div>}
        {allowOrder && (
          <div style={{ display: "grid", gap: 5 }}>
            {item.sizes.map((size) => (
              <label key={size} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
                <span>{size}</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={`${item.name} ${size}`}
                  // Vazio em vez de "0": no celular o cursor cai onde o dedo
                  // toca, e digitar 2 a esquerda de um zero virava 20 pecas.
                  value={qty[size] || ""}
                  placeholder="0"
                  onFocus={(event) => event.target.select()}
                  onChange={(event) => onQty(size, Number(event.target.value))}
                  // 16px evita o zoom automatico do Safari no iPhone ao tocar
                  // no campo; 44px de altura e o minimo confortavel para o dedo.
                  style={{
                    width: 64,
                    height: 44,
                    fontSize: 16,
                    border: "1px solid #d8d0c6",
                    padding: "5px 8px",
                    background: "white",
                  }}
                />
              </label>
            ))}
            {Object.values(qty).some((value) => value > 0) && (
              <div style={{ fontSize: 12, color: "#6f665e" }}>
                {Object.values(qty).reduce((sum, value) => sum + value, 0)} peca(s) neste item
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Painel mostrado depois que o pedido e registrado.
 *
 * Cobre os tres desfechos possiveis: cobranca emitida com Pix para pagar,
 * falha na emissao (o pedido existe, a cobranca nao) e pedido sem cobranca,
 * quando o link nao cobra.
 */
function PaymentPanel({ response, onClose }: { response: TokenOrderResponse; onClose: () => void }) {
  const payment = response.payment;
  const pixCode = payment?.pix_qr_code;
  const failed = payment?.status === "failed";

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
      </div>
    </section>
  );
}

/**
 * Catalogo no celular: uma peca por tela, com rolagem que encaixa.
 *
 * O layout de grade que serve no desktop nao servia aqui — cabecalho fixo em
 * cima e barra de pedido fixa embaixo sobravam menos de um terco da tela para a
 * foto. Aqui o cabecalho rola embora, cada peca ocupa a tela inteira e o pedido
 * mora numa folha que sobe so quando o comprador chama.
 */
function MobileCatalog(props: {
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
  const { data, publicOnly, qty, piecesCount, total, placedOrder } = props;
  const temPedido = publicOnly ? props.selected.size > 0 : piecesCount > 0;

  if (placedOrder) {
    return (
      <main style={{ minHeight: "100dvh", background: "#faf8f5", overflowY: "auto" }}>
        <PaymentPanel response={placedOrder} onClose={props.onClosePayment} />
      </main>
    );
  }

  return (
    <>
      <main
        style={{
          height: "100dvh",
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          background: "#faf8f5",
          color: "#1d1b18",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Sem position:sticky — some ao rolar e devolve a tela para as fotos. */}
        <header style={{ padding: "20px 16px 16px", background: "white", borderBottom: "1px solid #e5ded4" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "#8a7f73" }}>
            {publicOnly ? "Catalogo" : "Atacado"}
          </div>
          <h1 style={{ fontSize: 22, margin: "6px 0 0", lineHeight: 1.15 }}>{data.catalog.name}</h1>
          <div style={{ fontSize: 13, color: "#6f665e", marginTop: 6 }}>
            {data.items.length} pecas · deslize para ver
          </div>
        </header>

        {data.items.map((item, index) => (
          <MobileItemScreen
            key={item.id}
            item={item}
            posicao={index + 1}
            deTotal={data.items.length}
            showPrices={data.show_prices}
            allowOrder={data.allow_order}
            selected={props.selected.has(item.id)}
            qty={qty[item.id] ?? {}}
            onToggle={() => props.onToggle(item.id)}
            onQty={(size, value) => props.onQty(item.id, size, value)}
          />
        ))}
      </main>

      {!props.sheetOpen && (
        <MobileSummaryPill
          publicOnly={publicOnly}
          temPedido={temPedido}
          piecesCount={piecesCount}
          selecionadas={props.selected.size}
          total={total}
          showPrices={data.show_prices}
          onOpen={props.onOpenSheet}
        />
      )}

      {props.sheetOpen && (
        <MobileCheckoutSheet
          {...props}
          temPedido={temPedido}
        />
      )}
    </>
  );
}

/** Uma peca ocupando a tela inteira, com a foto grande e a grade embaixo. */
function MobileItemScreen({ item, posicao, deTotal, showPrices, allowOrder, selected, qty, onToggle, onQty }: {
  item: PublicCatalogItem;
  posicao: number;
  deTotal: number;
  showPrices: boolean;
  allowOrder: boolean;
  selected: boolean;
  qty: Record<string, number>;
  onToggle: () => void;
  onQty: (size: string, value: number) => void;
}) {
  const pecasNoItem = Object.values(qty).reduce((soma, v) => soma + v, 0);
  const atributos = [item.color, item.pantone, item.size_group].filter(Boolean).join(" · ");

  return (
    <section
      style={{
        height: "100dvh",
        scrollSnapAlign: "start",
        display: "flex",
        flexDirection: "column",
        background: "white",
        borderBottom: "1px solid #e5ded4",
      }}
    >
      <div style={{ position: "relative", flex: 1, minHeight: 0, background: "#eee8df" }}>
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
          />
        )}
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: "rgba(29,27,24,0.72)", color: "white",
          fontSize: 12, padding: "4px 10px", borderRadius: 999,
        }}>
          {posicao}/{deTotal}
        </div>
        {pecasNoItem > 0 && (
          <div style={{
            position: "absolute", top: 12, left: 12,
            background: "#1d1b18", color: "white",
            fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999,
          }}>
            {pecasNoItem} no pedido
          </div>
        )}
      </div>

      <div style={{ padding: "14px 16px", display: "grid", gap: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>{item.name}</div>
          <div style={{ fontSize: 13, color: "#6f665e", marginTop: 3 }}>{atributos || "Sem classificacao"}</div>
        </div>

        {showPrices && (
          <div style={{ fontSize: 20, fontWeight: 700 }}>{brl(Number(item.price ?? 0))}</div>
        )}

        {allowOrder ? (
          <div style={{ display: "grid", gap: 8 }}>
            {item.sizes.map((size) => (
              <SizeStepper
                key={size}
                size={size}
                valor={qty[size] ?? 0}
                onChange={(valor) => onQty(size, valor)}
              />
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={selected}
            style={{
              ...buttonStyle(selected ? "primary" : "secondary"),
              width: "100%",
              justifyContent: "center",
            }}
          >
            {selected ? <Check size={18} /> : null}
            {selected ? "Selecionada" : "Tenho interesse nesta"}
          </button>
        )}
      </div>
    </section>
  );
}

/** Menos e mais de 44px: no celular ninguem quer digitar num campo minusculo. */
function SizeStepper({ size, valor, onChange }: { size: string; valor: number; onChange: (v: number) => void }) {
  const botao: React.CSSProperties = {
    width: 44, height: 44,
    border: "1px solid #d8d0c6",
    background: "white",
    fontSize: 20, lineHeight: 1,
    cursor: "pointer",
    display: "grid", placeItems: "center",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <span style={{ fontSize: 15, fontWeight: 500 }}>{size}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button type="button" aria-label={`Tirar uma peca do tamanho ${size}`} style={botao}
          onClick={() => onChange(Math.max(0, valor - 1))}>−</button>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          aria-label={size}
          value={valor || ""}
          placeholder="0"
          onFocus={(event) => event.target.select()}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
          style={{ width: 56, height: 44, fontSize: 16, textAlign: "center", border: "1px solid #d8d0c6", background: "white" }}
        />
        <button type="button" aria-label={`Somar uma peca do tamanho ${size}`} style={botao}
          onClick={() => onChange(valor + 1)}>+</button>
      </div>
    </div>
  );
}

/**
 * Resumo flutuante: ocupa uma faixa fina, nao um terco da tela como a barra
 * antiga. So aparece quando ha o que enviar.
 */
function MobileSummaryPill({ publicOnly, temPedido, piecesCount, selecionadas, total, showPrices, onOpen }: {
  publicOnly: boolean;
  temPedido: boolean;
  piecesCount: number;
  selecionadas: number;
  total: number;
  showPrices: boolean;
  onOpen: () => void;
}) {
  if (!temPedido) return null;

  const resumo = publicOnly
    ? `${selecionadas} peca(s) selecionada(s)`
    : `${piecesCount} peca(s)${showPrices ? ` · ${brl(total)}` : ""}`;

  return (
    <div style={{
      position: "fixed", left: 12, right: 12,
      bottom: "calc(12px + env(safe-area-inset-bottom))",
      zIndex: 30,
    }}>
      <button
        type="button"
        onClick={onOpen}
        style={{
          width: "100%", minHeight: 54,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, padding: "0 18px",
          background: "#1d1b18", color: "white",
          border: "none", borderRadius: 999,
          boxShadow: "0 6px 24px rgba(29,27,24,0.28)",
          fontSize: 15, cursor: "pointer",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShoppingBag size={18} />
          {resumo}
        </span>
        <span style={{ fontWeight: 600 }}>{publicOnly ? "Enviar" : "Fechar pedido"}</span>
      </button>
    </div>
  );
}

/** Folha que sobe com contato e acoes. Fecha tocando fora ou no X. */
function MobileCheckoutSheet(props: {
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
