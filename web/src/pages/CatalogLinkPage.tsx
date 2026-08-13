import { useMemo, useState } from "react";
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

type QtyMap = Record<number, Record<string, number>>;
const PHONE_MIN_DIGITS = 10;

export default function CatalogLinkPage() {
  const { token = "" } = useParams<{ token: string }>();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [qty, setQty] = useState<QtyMap>({});
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerDocument, setBuyerDocument] = useState("");
  const [placedOrder, setPlacedOrder] = useState<TokenOrderResponse | null>(null);

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
      void navigator.clipboard.writeText(url);
      toast.success("Link da selecao copiado.");
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
      : (orderLines.length === 0 ? "Selecione fotos e informe as quantidades por tamanho para registrar o pedido." : `${selectedCount} foto(s) selecionada(s) · ${piecesCount} peca(s) no pedido.`));

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
                {selectedCount} selecionada(s){piecesCount > 0 ? ` · ${piecesCount} peca(s)` : ""}
              </div>
            )}
          </div>
        </div>
      </header>

      {placedOrder && (
        <PaymentPanel response={placedOrder} onClose={() => setPlacedOrder(null)} />
      )}

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "22px 18px 140px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
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

      <footer style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        background: "white",
        borderTop: "1px solid #e5ded4",
        padding: "12px 18px",
        zIndex: 20,
      }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, alignItems: "center" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={buyerName}
                onChange={(event) => setBuyerName(event.target.value)}
                placeholder={publicOnly ? "Seu nome" : "Nome do comprador"}
                style={inputStyle(showContactValidation && !buyerNameFilled)}
              />
              <input
                value={buyerPhone}
                onChange={(event) => setBuyerPhone(formatPhoneInput(event.target.value))}
                placeholder="WhatsApp"
                style={inputStyle(showContactValidation && !buyerPhoneFilled)}
              />
              {documentRequired && (
                <input
                  value={buyerDocument}
                  onChange={(event) => setBuyerDocument(formatDocumentInput(event.target.value))}
                  placeholder="CPF ou CNPJ"
                  inputMode="numeric"
                  aria-label="CPF ou CNPJ"
                  style={inputStyle(showContactValidation && !buyerDocumentValid)}
                />
              )}
            </div>
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
          {item.image_url && <img src={item.image_url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />}
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
                  value={qty[size] ?? 0}
                  onChange={(event) => onQty(size, Number(event.target.value))}
                  style={{ width: 58, border: "1px solid #d8d0c6", padding: "5px 6px" }}
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
    void navigator.clipboard.writeText(pixCode);
    toast.success("Codigo Pix copiado.");
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

function CenteredText({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#faf8f5", color: "#6f665e" }}>
      {children}
    </main>
  );
}

function inputStyle(invalid = false): React.CSSProperties {
  return {
    height: 38,
    width: "min(100%, 220px)",
    border: `1px solid ${invalid ? "#b04848" : "#d8d0c6"}`,
    padding: "0 10px",
    background: "white",
  };
}

function buttonStyle(variant: "primary" | "secondary" | "ghost", disabled = false): React.CSSProperties {
  if (variant === "ghost") {
    return {
      height: 38,
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
    height: 38,
    display: "inline-flex",
    alignItems: "center",
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
