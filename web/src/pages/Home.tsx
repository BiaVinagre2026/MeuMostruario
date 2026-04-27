import { useNavigate } from "react-router-dom";
import { Photo, Btn, Tag } from "@/components/showroom/primitives";
import { Icons } from "@/components/showroom/icons";
import { PRODUCTS, COLLECTIONS, TIERS, brl } from "@/data/catalog";

export default function Home() {
  const navigate = useNavigate();
  const featured = PRODUCTS.filter(p => p.featured);

  return (
    <main>
      {/* Hero */}
      <section style={{ position: "relative", height: "calc(100vh - 110px)", minHeight: 600 }}>
        <Photo tone="clay" ratio="auto" product={PRODUCTS.find(x => x.id === "SOL-001")} view="front"
          caption="Look 01 · Solar · Atelier"
          style={{ position: "absolute", inset: 0, aspectRatio: "auto" }}/>
        <div style={{ position: "absolute", inset: 0, padding: 48, display: "flex", flexDirection: "column", justifyContent: "flex-end", color: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 32 }}>
            <div>
              <div className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.8, marginBottom: 24 }}>
                Drop · Verão 26 · 34 peças
              </div>
              <h1 className="display" style={{ fontSize: "clamp(64px, 9vw, 168px)", fontStyle: "italic", maxWidth: "9ch" }}>
                Solar.
              </h1>
              <div className="display" style={{ fontSize: "clamp(28px, 3vw, 44px)", marginTop: -12, opacity: 0.9 }}>
                Mostruário aberto para multimarca.
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end", minWidth: 320 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: "0.1em", opacity: 0.75, textAlign: "right" }}>
                Prazo de produção 30 dias · Envio a partir de 15.06
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn variant="accent" size="lg" onClick={() => navigate("/catalog")} icon={<Icons.Arrow/>}>Ver catálogo</Btn>
                <Btn variant="outline" size="lg" onClick={() => navigate("/lookbook")} style={{ color: "white", borderColor: "white" }}>Lookbook</Btn>
              </div>
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", top: 48, right: 48, writingMode: "vertical-rl", color: "white", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.7 }}>
          Índice 01/04 · Solar
        </div>
      </section>

      {/* How it works */}
      <section style={{ borderTop: "1px solid var(--brand-border)", borderBottom: "1px solid var(--brand-border)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            { k: "01", t: "Cadastro B2B",  d: "CNPJ + IE. Aprovação em 24h e área do lojista liberada." },
            { k: "02", t: "Pedido mínimo", d: "12 peças ou R$ 1.500 em qualquer combinação do mostruário." },
            { k: "03", t: "Grade flexível",d: "Escolha tamanhos P/M/G por cor na mesma linha." },
            { k: "04", t: "Pagamento",     d: "30/60/90 para novos parceiros · Pix com 3% off." },
          ].map((x, i) => (
            <div key={x.k} style={{ padding: "40px 32px", borderRight: i < 3 ? "1px solid var(--brand-border)" : "none" }}>
              <div className="mono" style={{ fontSize: 11, color: "var(--brand-muted)", letterSpacing: "0.14em", marginBottom: 24 }}>{x.k}</div>
              <h3 className="display" style={{ fontSize: 28, marginBottom: 12 }}>{x.t}</h3>
              <p style={{ fontSize: 13, color: "var(--brand-muted)", lineHeight: 1.55 }}>{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section style={{ padding: "96px 32px" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 16 }}>Destaques do drop</div>
              <h2 className="display" style={{ fontSize: 72 }}>Peças que <em>saem primeiro</em>.</h2>
            </div>
            <button onClick={() => navigate("/catalog")} style={{
              fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
              display: "inline-flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid var(--brand-foreground)", paddingBottom: 4,
            }}>Todas as 115 peças <Icons.Arrow/></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
            {featured.map(p => (
              <button key={p.id} onClick={() => navigate(`/product/${p.id}`)} style={{ textAlign: "left", display: "block" }}>
                <Photo tone={p.colors[0].tone} ratio="3/4" product={p} caption={p.id}/>
                <div style={{ padding: "20px 4px", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "baseline", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "var(--brand-muted)", marginTop: 4 }}>
                      {p.colors.length} cores · {p.sizes.join(" ")}
                    </div>
                  </div>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 500 }}>{brl(p.price)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Collections */}
      <section style={{ padding: "0 32px 96px" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Arquitetura da coleção</div>
          <h2 className="display" style={{ fontSize: 72, marginBottom: 48 }}>Quatro linhas. <em>Um atelier.</em></h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
            {COLLECTIONS.map((c, i) => (
              <button key={c.id} onClick={() => navigate("/catalog")}
                style={{ textAlign: "left", background: "var(--brand-surface)", padding: 32, display: "flex", flexDirection: "column", gap: 24, minHeight: 320 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="mono" style={{ fontSize: 11, letterSpacing: "0.12em" }}>0{i + 1}</span>
                  <Tag tone={c.status === "DROP ATIVO" ? "accent" : "outline"}>{c.status}</Tag>
                </div>
                <div style={{ marginTop: "auto" }}>
                  <div className="display" style={{ fontSize: 44 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: "var(--brand-muted)", marginTop: 8 }}>{c.season} · {c.pieces} peças</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Virtual try-on callout */}
      <section style={{ background: "var(--brand-foreground)", color: "white", padding: "96px 32px" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          <div>
            <div className="eyebrow" style={{ color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>Experimentação digital</div>
            <h2 className="display" style={{ fontSize: 84, lineHeight: 0.95 }}>Sua cliente <em>prova antes</em> de pedir.</h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: "rgba(255,255,255,0.7)", marginTop: 32, maxWidth: 480 }}>
              Envie uma foto, escolha cor e tamanho, e veja a peça ajustada no corpo em segundos.
              Reduz troca, acelera o fechamento do pedido, e transforma a lojista em embaixadora do drop.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <Btn variant="accent" size="lg" onClick={() => navigate("/product/SOL-001")}>Abrir prova virtual</Btn>
              <Btn variant="ghost" size="lg" style={{ color: "white", borderColor: "rgba(255,255,255,0.3)" }}>Como funciona</Btn>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            <Photo tone="sand" ratio="3/4" caption="Antes · sem peça"/>
            <Photo tone="coral" ratio="3/4" product={PRODUCTS.find(x => x.id === "SOL-001")} caption="Depois · SOL-001 · Coral · M"/>
          </div>
        </div>
      </section>

      {/* Pricing tiers */}
      <section style={{ padding: "96px 32px", background: "var(--brand-surface)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div className="eyebrow" style={{ marginBottom: 16, textAlign: "center" }}>Preços por volume</div>
          <h2 className="display" style={{ fontSize: 56, textAlign: "center", marginBottom: 48 }}>
            Quanto mais pedir, <em>mais margem.</em>
          </h2>
          <div style={{ background: "white", border: "1px solid var(--brand-border)" }}>
            {TIERS.map((t, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "60px 1fr 1fr 160px",
                alignItems: "center", padding: "24px 32px",
                borderBottom: i < TIERS.length - 1 ? "1px solid var(--brand-border)" : "none",
                fontSize: 15,
              }}>
                <span className="mono" style={{ color: "var(--brand-muted)" }}>0{i + 1}</span>
                <span style={{ fontSize: 20, fontWeight: 500 }}>{t.label}</span>
                <span className="mono" style={{ color: "var(--brand-muted)" }}>
                  {t.min}{t.max ? `–${t.max}` : "+"} peças
                </span>
                <span className="display" style={{ fontSize: 36, color: t.discount ? "var(--brand-primary)" : "var(--brand-foreground)" }}>
                  {t.discount ? `−${t.discount}%` : "base"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
