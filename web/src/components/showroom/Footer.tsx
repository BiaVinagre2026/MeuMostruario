import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Logo, Btn } from "./primitives";
import { Icons } from "./icons";
import { TENANT, TIERS } from "@/data/catalog";
import { PaymentModal } from "./PaymentModal";
import { useTenant } from "@/providers/TenantProvider";
import { openWhatsapp } from "@/lib/whatsapp";
import { toast } from "sonner";

type FooterModal = "how" | "minorder" | "payment" | null;

function useIsMobile(bp = 768) {
  const [v, setV] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const h = () => setV(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return v;
}

export function Footer({ compact = false }: { compact?: boolean }) {
  const navigate  = useNavigate();
  const [modal, setModal] = useState<FooterModal>(null);
  const isMobile  = useIsMobile();
  const tenant    = useTenant();

  // O numero vem das Configuracoes do tenant. Sem ele configurado, avisa em vez
  // de abrir uma conversa vazia.
  function falarComAtacado() {
    const aberto = openWhatsapp(
      tenant.social.whatsapp,
      `Ola! Vim pelo catalogo da ${tenant.companyName || tenant.tenantName} e quero falar sobre atacado.`
    );
    if (!aberto) toast.error("WhatsApp ainda nao configurado nas Configuracoes do tenant.");
  }

  if (compact) {
    return (
      <footer style={{
        background: "var(--brand-foreground)", color: "white",
        padding: isMobile ? "12px 16px" : "14px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em",
        textTransform: "uppercase", opacity: 0.9, gap: 12,
      }}>
        <Logo size={14}/>
        {!isMobile && <span style={{ opacity: 0.5 }}>{TENANT.name} · {TENANT.cnpj} · São Paulo, Brasil</span>}
        <Btn variant="accent" size="sm" icon={<Icons.Whats/>}
          onClick={falarComAtacado}>
          Atacado
        </Btn>
      </footer>
    );
  }

  const vendas = [
    { label: "Como comprar",        onClick: () => setModal("how") },
    { label: "Pedido mínimo",       onClick: () => setModal("minorder") },
    { label: "Formas de pagamento", onClick: () => setModal("payment") },
  ];

  const linkStyle: React.CSSProperties = {
    fontSize: 14, textAlign: "left", color: "white", cursor: "pointer",
  };
  const clickableLinkStyle: React.CSSProperties = {
    ...linkStyle,
    borderBottom: "1px solid rgba(255,255,255,0.25)", paddingBottom: 1,
  };

  return (
    <>
      <footer style={{ background: "var(--brand-foreground)", color: "white", padding: isMobile ? "40px 20px 24px" : "80px 32px 32px" }}>

        {isMobile ? (
          /* ── Layout mobile: coluna única, info essencial ── */
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <Logo size={20}/>
            <p className="display" style={{ fontSize: 24, lineHeight: 1.2, marginTop: 20, marginBottom: 24 }}>
              Moda feita em <em>pequenos lotes</em>, para multimarcas curadas.
            </p>
            <Btn variant="accent" icon={<Icons.Whats/>}
              style={{ width: "100%", justifyContent: "center" }}
              onClick={falarComAtacado}>
              Falar com o atacado
            </Btn>

            {/* Vendas — só os links com ação */}
            <div style={{ marginTop: 32, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 24 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.5, marginBottom: 16 }}>
                Vendas
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                {vendas.filter(v => v.onClick).map(v => (
                  <li key={v.label}>
                    <button onClick={v.onClick} style={clickableLinkStyle}>{v.label}</button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom mobile */}
            <div style={{
              marginTop: 32, paddingTop: 20,
              borderTop: "1px solid rgba(255,255,255,0.15)",
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em",
              textTransform: "uppercase", opacity: 0.4,
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              <span>{TENANT.name} · {TENANT.cnpj}</span>
              <span>São Paulo · Brasil · Powered by Mostruário</span>
            </div>
          </div>
        ) : (
          /* ── Layout desktop: coluna única, links na horizontal ── */
          <>
            <div style={{ maxWidth: 1440, margin: "0 auto" }}>
              <Logo size={28}/>
              <p className="display" style={{ fontSize: 28, lineHeight: 1.15, marginTop: 24, whiteSpace: "nowrap" }}>
                Moda feita em <em>pequenos lotes</em>, para multimarcas curadas.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 28, flexWrap: "wrap" }}>
                <Btn variant="accent" icon={<Icons.Whats/>}
                  onClick={falarComAtacado}>
                  Falar com o atacado
                </Btn>
                <ul style={{ listStyle: "none", display: "flex", gap: 28, alignItems: "center" }}>
                  {vendas.map(v => (
                    <li key={v.label}>
                      <button onClick={v.onClick} style={clickableLinkStyle}>{v.label}</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{
              maxWidth: 1440, margin: "64px auto 0", paddingTop: 24,
              borderTop: "1px solid rgba(255,255,255,0.15)",
              display: "flex", justifyContent: "space-between",
              fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em",
              textTransform: "uppercase", opacity: 0.5,
            }}>
              <span>{TENANT.name} Atelier · {TENANT.cnpj}</span>
              <span>São Paulo · Brasil</span>
              <span>Powered by Mostruário — SaaS white-label</span>
            </div>
          </>
        )}
      </footer>

      {/* Modals */}
      {modal && modal !== "payment" && (
        <FooterOverlay onClose={() => setModal(null)}>
          {modal === "how"      && <HowToBuyContent onB2B={() => { setModal(null); navigate("/"); }} />}
          {modal === "minorder" && <MinOrderContent />}
        </FooterOverlay>
      )}
      {modal === "payment" && <PaymentModal onClose={() => setModal(null)} />}
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

// ── Como Comprar ─────────────────────────────────────────────────────────────

function HowToBuyContent({ onB2B }: { onB2B: () => void }) {
  const steps = [
    { n: "01", title: "Crie sua conta lojista", desc: "Preencha o formulário com CNPJ, Inscrição Estadual e dados de contato. Nossa equipe avalia e aprova em até 24 horas." },
    { n: "02", title: "Acesse o catálogo", desc: "Com login ativo, você vê preços atacado, grade de tamanhos (PP ao GG) e estoque disponível por cor." },
    { n: "03", title: "Use o provador virtual", desc: "Clique em 'Provar no corpo'. Faça upload de uma foto e a IA renderiza a peça em segundos." },
    { n: "04", title: "Monte sua grade", desc: "Para cada peça, escolha a cor e distribua as quantidades nos tamanhos desejados." },
    { n: "05", title: "Confirme o pedido", desc: "Revise o resumo, escolha a forma de pagamento e feche via WhatsApp." },
    { n: "06", title: "Receba e revenda", desc: "Prazo médio de 30 dias. Entregamos para todo o Brasil com rastreio." },
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
            display: "grid", gridTemplateColumns: "48px 1fr", gap: 20,
            paddingBottom: 24,
            borderBottom: i < steps.length - 1 ? "1px solid var(--brand-border)" : "none",
            marginBottom: i < steps.length - 1 ? 24 : 0,
          }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--brand-muted)" }}>{s.n}</div>
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
        <strong style={{ color: "var(--brand-foreground)" }}>R$ 1.500</strong> em qualquer combinação do mostruário.
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
            <span className="mono" style={{ fontSize: 12, color: "var(--brand-muted)" }}>{t.min}{t.max ? `–${t.max}` : "+"} peças</span>
            <span className="display" style={{ fontSize: 26, color: t.discount ? "var(--brand-primary)" : "var(--brand-foreground)", textAlign: "right" }}>
              {t.discount ? `−${t.discount}%` : "base"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

