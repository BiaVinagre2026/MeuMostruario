import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo, Btn } from "./primitives";
import { Icons } from "./icons";
import { TENANT, COLLECTIONS, TIERS, brl } from "@/data/catalog";

type FooterModal = "how" | "minorder" | "payment" | null;

export function Footer({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [modal, setModal] = useState<FooterModal>(null);

  if (compact) {
    return (
      <footer style={{
        background: "var(--brand-foreground)", color: "white",
        padding: "14px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em",
        textTransform: "uppercase", opacity: 0.9,
      }}>
        <Logo size={16}/>
        <span style={{ opacity: 0.5 }}>{TENANT.name} · {TENANT.cnpj} · São Paulo, Brasil</span>
        <Btn variant="accent" size="sm" icon={<Icons.Whats/>}
          onClick={() => alert("Abre WhatsApp: " + TENANT.whatsapp)}>
          Atacado
        </Btn>
      </footer>
    );
  }

  // items with optional click handler
  const vendas: Array<{ label: string; onClick?: () => void }> = [
    { label: "Como comprar",          onClick: () => setModal("how") },
    { label: "Pedido mínimo",         onClick: () => setModal("minorder") },
    { label: "Formas de pagamento",   onClick: () => setModal("payment") },
    { label: "Representantes" },
    { label: "Devoluções" },
  ];

  const cols = [
    { title: "Coleções", items: COLLECTIONS.map(c => ({ label: c.name })) },
    { title: "Atelier",  items: [
      { label: "Sobre" }, { label: "Processo" }, { label: "Matérias-primas" },
      { label: "Sustentabilidade" }, { label: "Contato" },
    ]},
  ];

  const linkStyle: React.CSSProperties = {
    fontSize: 14, textAlign: "left", color: "white",
    cursor: "pointer", opacity: 1,
  };
  const clickableLinkStyle: React.CSSProperties = {
    ...linkStyle,
    borderBottom: "1px solid rgba(255,255,255,0.25)",
    paddingBottom: 1,
  };

  return (
    <>
      <footer style={{ background: "var(--brand-foreground)", color: "white", padding: "80px 32px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, maxWidth: 1440, margin: "0 auto" }}>
          <div>
            <Logo size={28}/>
            <p className="display" style={{ fontSize: 40, lineHeight: 1, marginTop: 32, maxWidth: 380 }}>
              Moda feita em <em>pequenos lotes</em>, para multimarcas curadas.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <Btn variant="accent" icon={<Icons.Whats/>}
                onClick={() => alert("Abre WhatsApp: " + TENANT.whatsapp)}>
                Falar com o atacado
              </Btn>
            </div>
          </div>

          {/* Vendas — com links funcionais */}
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.5, marginBottom: 20 }}>
              Vendas
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {vendas.map(v => (
                <li key={v.label}>
                  {v.onClick ? (
                    <button onClick={v.onClick} style={clickableLinkStyle}>{v.label}</button>
                  ) : (
                    <span style={{ ...linkStyle, opacity: 0.6 }}>{v.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Coleções e Atelier */}
          {cols.map(c => (
            <div key={c.title}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.5, marginBottom: 20 }}>
                {c.title}
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {c.items.map(i => <li key={i.label} style={{ ...linkStyle, opacity: 0.6 }}>{i.label}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div style={{
          maxWidth: 1440, margin: "64px auto 0", paddingTop: 24,
          borderTop: "1px solid rgba(255,255,255,0.15)",
          display: "flex", justifyContent: "space-between",
          fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.5,
        }}>
          <span>{TENANT.name} Atelier · {TENANT.cnpj}</span>
          <span>São Paulo · Brasil</span>
          <span>Powered by Mostruário — SaaS white-label</span>
        </div>
      </footer>

      {/* Modals */}
      {modal && (
        <FooterOverlay onClose={() => setModal(null)}>
          {modal === "how"      && <HowToBuyContent onB2B={() => { setModal(null); navigate("/"); }} />}
          {modal === "minorder" && <MinOrderContent />}
          {modal === "payment"  && <PaymentContent />}
        </FooterOverlay>
      )}
    </>
  );
}

// ── Overlay ──────────────────────────────────────────────────────────────────

function FooterOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
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
          <Icons.X/>
        </button>
        {children}
      </div>
    </div>
  );
}

// ── Como Comprar (Como Funciona) ─────────────────────────────────────────────

function HowToBuyContent({ onB2B }: { onB2B: () => void }) {
  const steps = [
    {
      n: "01",
      title: "Crie sua conta lojista",
      desc: "Preencha o formulário com CNPJ, Inscrição Estadual e dados de contato. Nossa equipe avalia e aprova em até 24 horas. Você recebe um e-mail com acesso à área do lojista.",
    },
    {
      n: "02",
      title: "Acesse o catálogo",
      desc: "Com login ativo, você vê preços atacado, grade de tamanhos (PP ao GG) e estoque disponível por cor. Filtre por coleção, categoria ou busque por SKU.",
    },
    {
      n: "03",
      title: "Use o provador virtual",
      desc: "Em qualquer produto, clique em 'Provar no corpo'. Faça upload de uma foto de corpo inteiro em boa iluminação — use JPG ou PNG de até 10 MB. Escolha cor e tamanho; a IA renderiza a peça no corpo em segundos. Você pode trocar cor e tamanho sem refazer a foto, e enviar o resultado para sua cliente pelo WhatsApp.",
    },
    {
      n: "04",
      title: "Monte sua grade",
      desc: "Para cada peça, escolha a cor e distribua as quantidades nos tamanhos desejados. O carrinho calcula automaticamente o total e o desconto por volume.",
    },
    {
      n: "05",
      title: "Confirme o pedido",
      desc: "Revise o resumo, escolha a forma de pagamento (30/60/90 DDL ou Pix com 3% off) e feche via WhatsApp. Nossa equipe confirma a produção por e-mail.",
    },
    {
      n: "06",
      title: "Receba e revenda",
      desc: "Prazo de produção médio de 30 dias. Entregamos para todo o Brasil com rastreio. Em caso de dúvidas, nosso WhatsApp está disponível na área do lojista.",
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Passo a passo</div>
        <h2 className="display" style={{ fontSize: 40 }}>Como comprar</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {steps.map((s, i) => (
          <div key={s.n} style={{
            display: "grid", gridTemplateColumns: "48px 1fr",
            gap: 20, paddingBottom: 24,
            borderBottom: i < steps.length - 1 ? "1px solid var(--brand-border)" : "none",
            marginBottom: i < steps.length - 1 ? 24 : 0,
          }}>
            <div>
              <div className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--brand-muted)" }}>{s.n}</div>
            </div>
            <div>
              <h3 className="display" style={{ fontSize: 22, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: "var(--brand-muted)", lineHeight: 1.65 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--brand-border)" }}>
        <button onClick={onB2B} style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
          borderBottom: "1px solid var(--brand-foreground)", paddingBottom: 2,
        }}>
          Criar conta lojista agora <Icons.Arrow/>
        </button>
      </div>
    </div>
  );
}

// ── Pedido Mínimo ────────────────────────────────────────────────────────────

function MinOrderContent() {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Condições comerciais</div>
      <h2 className="display" style={{ fontSize: 40, marginBottom: 8 }}>Pedido mínimo</h2>
      <p style={{ fontSize: 14, color: "var(--brand-muted)", lineHeight: 1.6, marginBottom: 32 }}>
        Pedido mínimo de <strong style={{ color: "var(--brand-foreground)" }}>12 peças</strong> ou{" "}
        <strong style={{ color: "var(--brand-foreground)" }}>R$ 1.500</strong> em qualquer combinação
        do mostruário. Quanto maior o pedido, maior o desconto.
      </p>

      <div className="eyebrow" style={{ marginBottom: 16 }}>Quanto mais pedir, mais margem.</div>
      <div style={{ border: "1px solid var(--brand-border)" }}>
        {TIERS.map((t, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "40px 1fr 1fr 100px",
            alignItems: "center", padding: "16px 20px",
            borderBottom: i < TIERS.length - 1 ? "1px solid var(--brand-border)" : "none",
            background: i % 2 === 0 ? "white" : "var(--brand-surface)",
          }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--brand-muted)" }}>0{i + 1}</span>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{t.label}</span>
            <span className="mono" style={{ fontSize: 12, color: "var(--brand-muted)" }}>
              {t.min}{t.max ? `–${t.max}` : "+"} peças
            </span>
            <span className="display" style={{ fontSize: 26, color: t.discount ? "var(--brand-primary)" : "var(--brand-foreground)", textAlign: "right" }}>
              {t.discount ? `−${t.discount}%` : "base"}
            </span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: "var(--brand-muted)", marginTop: 16, lineHeight: 1.55 }}>
        Os descontos são calculados automaticamente no carrinho conforme o total de peças adicionadas.
        Não é necessário que todas as peças sejam da mesma coleção.
      </p>
    </div>
  );
}

// ── Formas de Pagamento ──────────────────────────────────────────────────────

function PaymentContent() {
  const options = [
    { title: "30/60/90 DDL", desc: "Parcelas em boleto para novos parceiros aprovados. Disponível após análise de crédito no cadastro B2B." },
    { title: "Pix — 3% de desconto", desc: "Pagamento à vista via Pix com desconto de 3% sobre o total do pedido. Confirmação imediata." },
    { title: "Cartão de crédito", desc: "Parcelamento em até 6× sem juros no cartão. Disponível para pedidos acima de R$ 500." },
    { title: "Transferência bancária", desc: "TED/DOC para pedidos recorrentes de clientes ativos. Consulte condições específicas." },
    { title: "Outras condições", desc: "Para volumes acima de 100 peças ou pedidos recorrentes mensais, consulte nossa equipe comercial para condições especiais." },
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
      <div style={{ marginTop: 28, padding: 20, background: "var(--brand-surface)", fontSize: 13, color: "var(--brand-muted)", lineHeight: 1.6 }}>
        Dúvidas sobre pagamento? Entre em contato pelo WhatsApp{" "}
        <button
          onClick={() => alert("WhatsApp: " + TENANT.whatsapp)}
          style={{ fontWeight: 600, color: "var(--brand-foreground)", borderBottom: "1px solid currentColor" }}
        >
          {TENANT.whatsapp}
        </button>
      </div>
    </div>
  );
}
