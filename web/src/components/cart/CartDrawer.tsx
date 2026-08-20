import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/useCartStore";
import { Icons } from "@/components/showroom/icons";
import { Btn } from "@/components/showroom/primitives";
import { TIERS, brl, activeTier, TONE } from "@/data/catalog";
import { useTenant } from "@/providers/TenantProvider";
import { apiClient } from "@/lib/api/client";
import { extractWhatsappNumber } from "@/lib/whatsapp";
import type { CartItem } from "@/types/catalog";

function useIsMobile(bp = 768) {
  const [v, setV] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const h = () => setV(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return v;
}

export function CartDrawer() {
  const { items, isOpen, close, remove } = useCartStore();
  const tenant  = useTenant();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal    = items.reduce((a, item) => a + item.total * item.price, 0);
  const unitsTotal  = items.reduce((a, item) => a + item.total, 0);
  const tier        = activeTier(unitsTotal);
  const discount    = subtotal * (tier.discount / 100);
  const total       = subtotal - discount;
  const canCheckout = items.length > 0 && !loading;

  const whatsappNum = extractWhatsappNumber(tenant.social.whatsapp);

  function buildWhatsappMessage() {
    const lines = items.map(i => {
      const color = i.colors.find(c => c.id === i.colorId);
      const grade = Object.entries(i.qty)
        .filter(([, q]) => q > 0)
        .map(([s, q]) => `${s}×${q}`)
        .join(" ");
      return `• ${i.name} · ${color?.name ?? "—"} · ${grade} = ${i.total}un · ${brl(i.total * i.price)}`;
    }).join("\n");
    const name = tenant.tenantName || tenant.companyName || "Mostruário";
    return `Olá ${name}, quero fechar pedido:\n\n${lines}\n\nSubtotal: ${brl(subtotal)}${tier.discount > 0 ? `\nDesconto ${tier.discount}%: -${brl(discount)}` : ""}\n*Total: ${brl(total)}* · ${unitsTotal} peças`;
  }

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const orderItems = items.map(i => {
        const color = i.colors.find(c => c.id === i.colorId);
        return {
          product_name: i.name,
          sku:          i.sku ?? i.id,
          color:        color?.name ?? "",
          color_hex:    color?.hex ?? "",
          image_url:    i.colorImages?.[i.colorId] ?? i.imageUrl ?? "",
          price:        i.price,
          qty:          i.qty,
          total:        i.total * i.price,
        };
      });

      await apiClient.post("/api/v1/orders", {
        order: {
          items:        orderItems,
          subtotal:     subtotal,
          discount:     discount,
          discount_pct: tier.discount,
          total:        total,
        },
      });

      // Abre WhatsApp com a mensagem do pedido
      if (whatsappNum) {
        const msg = buildWhatsappMessage();
        window.open(`https://wa.me/${whatsappNum}?text=${encodeURIComponent(msg)}`, "_blank");
      }

      // Limpa o carrinho e fecha
      useCartStore.setState({ items: [], isOpen: false });
    } catch {
      setError("Não foi possível registrar o pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.45)", zIndex: 150, display: "flex", justifyContent: "flex-end" }}
      onClick={close}>
      <div onClick={e => e.stopPropagation()} className="sr-cart-drawer" style={{
        background: "white", height: "100%",
        display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
      }}>
        {/* Header */}
        <div style={{ padding: isMobile ? "14px 16px" : "20px 24px", borderBottom: "1px solid var(--brand-border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ fontSize: 10, letterSpacing: "0.12em" }}>Pedido em andamento</div>
            <div className="display" style={{ fontSize: isMobile ? 20 : 28, marginTop: 4, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Carrinho de compras
            </div>
          </div>
          <button onClick={close} style={{ marginTop: 4, color: "var(--brand-muted)", lineHeight: 1, flexShrink: 0 }}><Icons.X/></button>
        </div>

        {/* Progresso de desconto por volume */}
        <div style={{ padding: isMobile ? "10px 16px" : "12px 24px", background: "var(--brand-surface)", borderBottom: "1px solid var(--brand-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, color: "var(--brand-muted)" }}>
            <span>Peças no pedido</span>
            <span style={{ color: "var(--brand-foreground)", fontWeight: 600 }}>{unitsTotal} peças</span>
          </div>
          <div style={{ height: 3, background: "var(--brand-border)", borderRadius: 2 }}>
            <div style={{
              height: "100%", borderRadius: 2,
              background: tier.discount > 0 ? "var(--brand-primary)" : "var(--brand-foreground)",
              width: `${Math.min(100, (unitsTotal / (TIERS[TIERS.length - 1]?.min ?? 100)) * 100)}%`,
              transition: "width 0.3s ease",
            }}/>
          </div>
          {tier.discount > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--brand-primary)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", fontWeight: 600 }}>
              Desconto aplicado: −{tier.discount}% ({tier.label})
            </div>
          )}
        </div>

        {/* Lista de itens */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {items.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--brand-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              Nenhuma peça adicionada ainda.
            </div>
          ) : (
            <div style={{ padding: "8px 0" }}>
              {items.map((item, i) => (
                <CartItemRow key={i} item={item} onRemove={() => remove(i)}/>
              ))}
            </div>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div style={{ padding: "10px 24px", background: "#fef2f2", borderTop: "1px solid #fecaca", fontSize: 13, color: "#dc2626" }}>
            {error}
          </div>
        )}

        {/* Footer com totais e botão */}
        <div style={{ padding: isMobile ? "14px 16px" : "20px 24px", borderTop: "1px solid var(--brand-border)" }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--brand-muted)", marginBottom: 6 }}>
              <span>Subtotal ({unitsTotal} peças)</span>
              <span className="mono">{brl(subtotal)}</span>
            </div>
            {tier.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--brand-primary)", marginBottom: 6 }}>
                <span>Desconto volume ({tier.discount}%)</span>
                <span className="mono">−{brl(discount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: "1px solid var(--brand-border)", paddingTop: 10, marginTop: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
              <span className="display" style={{ fontSize: 26 }}>{brl(total)}</span>
            </div>
          </div>

          <Btn
            variant="accent" size="lg"
            style={{ width: "100%", gap: 10, opacity: loading ? 0.7 : 1 }}
            disabled={!canCheckout}
            icon={loading ? undefined : <Icons.Whats/>}
            onClick={handleCheckout}>
            {loading ? "Registrando pedido…" : canCheckout ? "Fechar pedido" : "Adicione peças para continuar"}
          </Btn>

          {!whatsappNum && (
            <p style={{ marginTop: 8, fontSize: 11, color: "var(--brand-muted)", textAlign: "center", fontFamily: "var(--font-mono)" }}>
              WhatsApp não configurado — pedido será registrado normalmente.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CartItemRow({ item, onRemove }: { item: CartItem; onRemove: () => void }) {
  const color     = item.colors.find(c => c.id === item.colorId);
  const tone      = TONE[color?.tone ?? "sand"];
  const imageUrl  = item.colorImages?.[item.colorId] ?? item.imageUrl;
  const grade     = Object.entries(item.qty)
    .filter(([, q]) => q > 0)
    .map(([s, q]) => `${s}×${q}`)
    .join("  ");

  return (
    <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--brand-border)", display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 14, alignItems: "center" }}>
      {/* Foto da cor ou swatch */}
      <div style={{
        width: 56, height: 72, borderRadius: 6, flexShrink: 0, overflow: "hidden",
        background: imageUrl ? "transparent" : (color?.hex ?? tone.bg),
        border: "1px solid var(--brand-border)",
      }}>
        {imageUrl && (
          <img src={imageUrl} alt={color?.name ?? item.name}
               style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        )}
      </div>

      {/* Detalhes */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.name}
        </div>
        {item.sku && (
          <div className="mono" style={{ fontSize: 10, color: "var(--brand-muted)", marginTop: 2 }}>
            {item.sku}
          </div>
        )}
        {color && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
            <span style={{
              display: "inline-block", width: 10, height: 10, borderRadius: "50%",
              background: color.hex ?? tone.bg, border: "1px solid rgba(0,0,0,0.12)",
            }}/>
            <span style={{ fontSize: 11, color: "var(--brand-muted)" }}>{color.name}</span>
          </div>
        )}
        <div className="mono" style={{ fontSize: 11, marginTop: 5, color: "var(--brand-foreground)", letterSpacing: "0.05em" }}>
          {grade}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--brand-muted)" }}>{item.total} peças</span>
          <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--brand-primary)" }}>{brl(item.total * item.price)}</span>
        </div>
      </div>

      {/* Remover */}
      <button onClick={onRemove} style={{ color: "var(--brand-muted)", padding: 4, lineHeight: 1 }}>
        <Icons.X/>
      </button>
    </div>
  );
}
