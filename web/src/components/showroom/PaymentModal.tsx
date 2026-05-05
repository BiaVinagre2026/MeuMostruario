import { Icons } from "./icons";

export function PaymentModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(10,10,10,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: "white", padding: 48, width: "100%", maxWidth: 640, maxHeight: "85vh", overflowY: "auto", position: "relative" }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, cursor: "pointer", opacity: 0.45 }}>
          <Icons.X />
        </button>
        <PaymentContent />
      </div>
    </div>
  );
}

function PaymentContent() {
  const options = [
    { title: "30/60/90 DDL", desc: "Parcelas em boleto para novos parceiros aprovados. Disponível após análise de crédito." },
    { title: "Pix — 3% de desconto", desc: "Pagamento à vista com desconto de 3% sobre o total do pedido." },
    { title: "Cartão de crédito", desc: "Parcelamento em até 6× sem juros. Disponível para pedidos acima de R$ 500." },
    { title: "Transferência bancária", desc: "TED/DOC para pedidos recorrentes de clientes ativos." },
  ];

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Condições financeiras</div>
      <h2 className="display" style={{ fontSize: 40, marginBottom: 28 }}>Formas de pagamento</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {options.map((o, i) => (
          <div key={o.title} style={{
            padding: "20px 0",
            borderBottom: i < options.length - 1 ? "1px solid var(--brand-border)" : "none",
          }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{o.title}</div>
            <p style={{ fontSize: 13, color: "var(--brand-muted)", lineHeight: 1.6 }}>{o.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
