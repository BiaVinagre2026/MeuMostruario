import { useCartStore } from "@/stores/useCartStore";
import { Icons } from "@/components/showroom/icons";
import { Btn } from "@/components/showroom/primitives";
import { TENANT, TIERS, brl, activeTier } from "@/data/catalog";
import type { CartItem } from "@/types/catalog";
import { TONE } from "@/data/catalog";

export function CartDrawer() {
  const { items, isOpen, close, remove } = useCartStore();

  if (!isOpen) return null;

  const subtotal = items.reduce((a, item) => a + item.total * item.price, 0);
  const unitsTotal = items.reduce((a, item) => a + item.total, 0);
  const tier = activeTier(unitsTotal);
  const discount = subtotal * (tier.discount / 100);
  const total = subtotal - discount;

  const metMinUnits = unitsTotal >= TENANT.minOrder.units;
  const metMinAmount = total >= TENANT.minOrder.amount;
  const canCheckout = metMinUnits && metMinAmount && items.length > 0;

  const handleWhatsApp = () => {
    const lines = items.map(i => {
      const color = i.colors.find(c => c.id === i.colorId);
      const grade = Object.entries(i.qty).filter(([, q]) => q > 0).map(([s, q]) => `${s}×${q}`).join(" ");
      return `• ${i.name} (${i.id}) · ${color?.name} · ${grade} = ${i.total}un`;
    }).join("\n");
    const msg = `Olá ${TENANT.name}, quero fechar pedido:\n\n${lines}\n\nTotal: ${unitsTotal}un · ${brl(total)}`;
    alert("Abriria WhatsApp com:\n\n" + msg);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.4)", zIndex: 150, display: "flex", justifyContent: "flex-end" }}
      onClick={close}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 560, background: "white", height: "100%", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: 24, borderBottom: "1px solid var(--brand-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="eyebrow">Pedido em andamento</div>
            <div className="display" style={{ fontSize: 32, marginTop: 4 }}>Seu mostruário</div>
          </div>
          <button onClick={close}><Icons.X/></button>
        </div>

        {/* MOQ progress */}
        <div style={{ padding: 16, background: "var(--brand-surface)", borderBottom: "1px solid var(--brand-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            <span>Pedido mínimo</span>
            <span>{unitsTotal}/{TENANT.minOrder.units} peças · {brl(total)}/{brl(TENANT.minOrder.amount)}</span>
          </div>
          <div style={{ height: 3, background: "var(--brand-border)" }}>
            <div style={{
              height: "100%",
              background: canCheckout ? "var(--brand-primary)" : "var(--brand-foreground)",
              width: `${Math.min(100, (unitsTotal / TENANT.minOrder.units) * 100)}%`,
              transition: "width var(--dur-2) var(--ease)",
            }}/>
          </div>
          {tier.discount > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--brand-primary)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
              Desconto {tier.label}: −{tier.discount}%
            </div>
          )}
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {items.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--brand-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              Nenhuma peça adicionada ainda.
            </div>
          ) : (
            items.map((item, i) => <CartItemRow key={i} item={item} onRemove={() => remove(i)}/>)
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: 24, borderTop: "1px solid var(--brand-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
            <span>Subtotal</span>
            <span className="mono">{brl(subtotal)}</span>
          </div>
          {tier.discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14, color: "var(--brand-primary)" }}>
              <span>Desconto volume ({tier.discount}%)</span>
              <span className="mono">−{brl(discount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <span style={{ fontWeight: 600 }}>Total</span>
            <span className="display" style={{ fontSize: 28 }}>{brl(total)}</span>
          </div>
          <Btn variant="accent" size="lg" style={{ width: "100%" }} disabled={!canCheckout}
            icon={<Icons.Whats/>} onClick={handleWhatsApp}>
            {canCheckout ? "Fechar pedido via WhatsApp" : `Faltam ${TENANT.minOrder.units - unitsTotal} peças para MOQ`}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function CartItemRow({ item, onRemove }: { item: CartItem; onRemove: () => void }) {
  const color = item.colors.find(c => c.id === item.colorId);
  const tone = TONE[color?.tone ?? "sand"];
  const grade = Object.entries(item.qty).filter(([, q]) => q > 0).map(([s, q]) => `${s}×${q}`).join(" ");

  return (
    <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--brand-border)", display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 16, alignItems: "center" }}>
      <div style={{ width: 48, height: 60, background: tone.bg, flexShrink: 0 }}/>
      <div>
        <div style={{ fontWeight: 500 }}>{item.name}</div>
        <div className="mono" style={{ fontSize: 11, color: "var(--brand-muted)", marginTop: 2 }}>{item.id} · {color?.name}</div>
        <div className="mono" style={{ fontSize: 11, marginTop: 4 }}>{grade}</div>
        <div className="mono" style={{ fontSize: 11, marginTop: 2, color: "var(--brand-primary)" }}>{item.total} peças · {brl(item.total * item.price)}</div>
      </div>
      <button onClick={onRemove} style={{ color: "var(--brand-muted)" }}><Icons.X/></button>
    </div>
  );
}
