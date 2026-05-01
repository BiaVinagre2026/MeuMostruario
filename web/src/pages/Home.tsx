import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Photo, Btn, Tag } from "@/components/showroom/primitives";
import { Icons } from "@/components/showroom/icons";
import { TIERS, brl, TONE } from "@/data/catalog";
import { useProducts, useCollections } from "@/hooks/useCatalog";
import { apiClient } from "@/lib/api/client";
import type { Product } from "@/types/catalog";

export default function Home() {
  const navigate = useNavigate();
  const { data: allProducts = [] } = useProducts();
  const { data: collections = [] } = useCollections();

  const [b2bOpen, setB2bOpen]         = useState(false);
  const [tryOnOpen, setTryOnOpen]     = useState(false);
  const [howOpen, setHowOpen]         = useState(false);

  const featured = allProducts.slice(0, 8);
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollCarousel = useCallback(() => {
    if (!carouselRef.current) return;
    const w = carouselRef.current.clientWidth / 3;
    carouselRef.current.scrollBy({ left: w + 4, behavior: "smooth" });
  }, []);

  // First product image per collection slug
  const collectionImages = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const p of allProducts) {
      if (p.collection && !map[p.collection]) map[p.collection] = p.imageUrl;
    }
    return map;
  }, [allProducts]);

  // Unique colors per collection slug (up to 8)
  const collectionColors = useMemo(() => {
    const map: Record<string, Array<{ id: string; hex?: string; tone: string; name: string }>> = {};
    for (const p of allProducts) {
      if (!p.collection) continue;
      if (!map[p.collection]) map[p.collection] = [];
      for (const c of p.colors) {
        if (!map[p.collection].some((x) => x.id === c.id) && map[p.collection].length < 8) {
          map[p.collection].push(c);
        }
      }
    }
    return map;
  }, [allProducts]);

  return (
    <main>
      {/* Hero */}
      <section style={{ position: "relative", height: "calc(100vh - 110px)", minHeight: 600 }}>
        {featured[0]?.imageUrl ? (
          <img
            src={featured[0].imageUrl}
            alt={featured[0]?.name ?? "Hero"}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "var(--brand-surface)" }}/>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 45%, transparent 100%)" }}/>
        <div style={{ position: "absolute", inset: 0, padding: 48, display: "flex", flexDirection: "column", justifyContent: "flex-end", color: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 32 }}>
            <div>
              <div className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.8, marginBottom: 24 }}>
                {collections[0]?.name ?? "Drop"} · {allProducts.length > 0 ? `${allProducts.length} peças` : "Mostruário"}
              </div>
              <h1 className="display" style={{ fontSize: "clamp(64px, 9vw, 168px)", fontStyle: "italic", maxWidth: "9ch" }}>
                {collections[0]?.name ?? "Mostruário"}.
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
              </div>
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", top: 48, right: 48, writingMode: "vertical-rl", color: "white", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.7 }}>
          Índice 01/{String(collections.length || 1).padStart(2, "0")} · {collections[0]?.name ?? "Drop"}
        </div>
      </section>

      {/* How it works */}
      <section style={{ borderTop: "1px solid var(--brand-border)", borderBottom: "1px solid var(--brand-border)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>

          {/* 01 — Cadastro Lojista */}
          <button
            onClick={() => setB2bOpen(true)}
            style={{ padding: "40px 32px", borderRight: "1px solid var(--brand-border)", textAlign: "left", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-surface)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div className="mono" style={{ fontSize: 11, color: "var(--brand-muted)", letterSpacing: "0.14em", marginBottom: 24 }}>01</div>
            <h3 className="display" style={{ fontSize: 28, marginBottom: 12 }}>Cadastro Lojista</h3>
            <p style={{ fontSize: 13, color: "var(--brand-muted)", lineHeight: 1.55 }}>
              CNPJ + IE. Aprovação em 24h e área do lojista liberada.
            </p>
            <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid var(--brand-foreground)", paddingBottom: 2 }}>
              Cadastrar agora <Icons.Arrow/>
            </div>
          </button>

          {/* 02 — Pedido mínimo */}
          <div style={{ padding: "40px 32px", borderRight: "1px solid var(--brand-border)" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--brand-muted)", letterSpacing: "0.14em", marginBottom: 24 }}>02</div>
            <h3 className="display" style={{ fontSize: 28, marginBottom: 12 }}>Pedido mínimo</h3>
            <p style={{ fontSize: 13, color: "var(--brand-muted)", lineHeight: 1.55 }}>
              12 peças ou R$ 1.500 em qualquer combinação do mostruário.
            </p>
          </div>

          {/* 03 — Grade flexível com chips de tamanho */}
          <div style={{ padding: "40px 32px", borderRight: "1px solid var(--brand-border)" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--brand-muted)", letterSpacing: "0.14em", marginBottom: 24 }}>03</div>
            <h3 className="display" style={{ fontSize: 28, marginBottom: 12 }}>Grade flexível</h3>
            <p style={{ fontSize: 13, color: "var(--brand-muted)", lineHeight: 1.55 }}>
              Escolha tamanhos por cor na mesma linha. Distribua a grade como quiser entre PP e GG.
            </p>
          </div>

          {/* 04 — Pagamento */}
          <div style={{ padding: "40px 32px" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--brand-muted)", letterSpacing: "0.14em", marginBottom: 24 }}>04</div>
            <h3 className="display" style={{ fontSize: 28, marginBottom: 12 }}>Pagamento</h3>
            <p style={{ fontSize: 13, color: "var(--brand-muted)", lineHeight: 1.55 }}>
              30/60/90 para novos parceiros · Pix com 3% off.
            </p>
            <button
              onClick={() => setB2bOpen(true)}
              style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-muted)", borderBottom: "1px solid var(--brand-muted)", paddingBottom: 2 }}
            >
              Consultar outras formas de pagamento <Icons.Arrow/>
            </button>
          </div>
        </div>
      </section>

      {/* Tabela de preços por volume — abaixo dos 4 cards */}
      <section style={{ padding: "32px 32px 36px", background: "var(--brand-surface)", borderBottom: "1px solid var(--brand-border)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div className="eyebrow" style={{ marginBottom: 10, textAlign: "center" }}>Quanto mais pedir, mais margem.</div>
          <div style={{ background: "white", border: "1px solid var(--brand-border)" }}>
            {TIERS.map((t, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "40px 1fr 1fr 100px",
                alignItems: "center", padding: "14px 24px",
                borderBottom: i < TIERS.length - 1 ? "1px solid var(--brand-border)" : "none",
              }}>
                <span className="mono" style={{ fontSize: 10, color: "var(--brand-muted)" }}>0{i + 1}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{t.label}</span>
                <span className="mono" style={{ fontSize: 12, color: "var(--brand-muted)" }}>
                  {t.min}{t.max ? `–${t.max}` : "+"} peças
                </span>
                <span className="display" style={{ fontSize: 24, color: t.discount ? "var(--brand-primary)" : "var(--brand-foreground)", textAlign: "right" }}>
                  {t.discount ? `−${t.discount}%` : "base"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured products — carrossel horizontal */}
      <section style={{ padding: "56px 0 56px 32px" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, paddingRight: 32 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 16 }}>Destaques do drop</div>
              <h2 className="display" style={{ fontSize: 72 }}>{allProducts.length > 0 ? `${allProducts.length} peças` : "Destaques"}. <em>Saem primeiro.</em></h2>
            </div>
            <button onClick={() => navigate("/catalog")} style={{
              fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
              display: "inline-flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid var(--brand-foreground)", paddingBottom: 4,
            }}>Ver catálogo <Icons.Arrow/></button>
          </div>

          <div style={{ position: "relative" }}>
            {/* Scroll container */}
            <div
              ref={carouselRef}
              style={{
                display: "flex", gap: 4,
                overflowX: "auto", scrollbarWidth: "none",
                scrollSnapType: "x mandatory",
                paddingRight: 32,
              }}
            >
              {featured.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/product/${p.id}`)}
                  style={{
                    flexShrink: 0,
                    width: "calc((100% - 32px) / 3 - 4px)",
                    textAlign: "left",
                    scrollSnapAlign: "start",
                    display: "block",
                  }}
                >
                  <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden", background: "var(--brand-surface)" }}>
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                      />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, background: TONE[p.colors[0]?.tone ?? "sand"]?.bg ?? "#e5e0db" }}/>
                    )}
                    <div style={{ position: "absolute", bottom: 12, left: 12, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "white", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                      {p.sku ?? p.id}
                    </div>
                  </div>
                  <div style={{ padding: "14px 4px" }}>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{p.name}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Seta direita */}
            <button
              onClick={scrollCarousel}
              style={{
                position: "absolute", right: 40, top: "40%", transform: "translateY(-50%)",
                width: 48, height: 48,
                background: "white", border: "1px solid var(--brand-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
                zIndex: 2,
              }}
            >
              <Icons.Arrow size={16}/>
            </button>
          </div>
        </div>
      </section>

      {/* Collections */}
      <section style={{ padding: "0 32px 56px" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Arquitetura da coleção</div>
          <h2 className="display" style={{ fontSize: 72, marginBottom: 48 }}>{collections.length || 3} {collections.length === 1 ? "linha" : "linhas"}. <em>Um atelier.</em></h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
            {(collections.length ? collections : []).map((c, i) => {
              const imgUrl   = collectionImages[c.id];
              const colors   = collectionColors[c.id] ?? [];
              return (
                <div key={c.id} style={{ display: "flex", flexDirection: "column" }}>
                  <button onClick={() => navigate("/catalog")}
                    style={{ textAlign: "left", background: "var(--brand-surface)", display: "flex", flexDirection: "column", minHeight: 320, position: "relative", overflow: "hidden" }}>
                    {imgUrl && (
                      <img src={imgUrl} alt={c.name}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}/>
                    )}
                    {imgUrl && (
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)" }}/>
                    )}
                    <div style={{ position: "relative", padding: 32, display: "flex", justifyContent: "space-between" }}>
                      <span className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", color: imgUrl ? "rgba(255,255,255,0.8)" : "var(--brand-muted)" }}>0{i + 1}</span>
                      <Tag tone={imgUrl ? "dark" : (c.status === "published" ? "accent" : "outline")}>{c.name}</Tag>
                    </div>
                    <div style={{ position: "relative", marginTop: "auto", padding: "0 32px 32px" }}>
                      <div className="display" style={{ fontSize: 44, color: imgUrl ? "white" : "var(--brand-foreground)" }}>{c.name}</div>
                    </div>
                  </button>
                  {/* Cores da coleção */}
                  {colors.length > 0 && (
                    <div style={{ padding: "12px 4px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {colors.map((cl) => (
                        <span key={cl.id} title={cl.name} style={{
                          width: 16, height: 16, borderRadius: 999,
                          background: cl.hex ?? TONE[cl.tone]?.bg ?? "#ccc",
                          border: "1px solid rgba(0,0,0,0.12)", flexShrink: 0,
                        }}/>
                      ))}
                      <span style={{ fontSize: 11, color: "var(--brand-muted)", marginLeft: 4 }}>
                        {colors.length} {colors.length === 1 ? "cor" : "cores"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Virtual try-on callout */}
      <section style={{ background: "var(--brand-foreground)", color: "white", padding: "64px 32px" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          <div>
            <div className="eyebrow" style={{ color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>Experimentação digital</div>
            <h2 className="display" style={{ fontSize: 84, lineHeight: 0.95 }}>Sua cliente <em>prova antes</em> de pedir.</h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: "rgba(255,255,255,0.7)", marginTop: 32, maxWidth: 480 }}>
              Envie uma foto, escolha cor e tamanho, e veja a peça ajustada no corpo em segundos.
              Reduz troca, acelera o fechamento do pedido, e transforma a lojista em embaixadora do drop.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <Btn variant="accent" size="lg" onClick={() => setTryOnOpen(true)}>Abrir prova virtual</Btn>
              <Btn variant="ghost" size="lg" style={{ color: "white", borderColor: "rgba(255,255,255,0.3)" }} onClick={() => setHowOpen(true)}>Como funciona</Btn>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            <Photo tone="sand" ratio="3/4" caption="Antes · sem peça"/>
            <Photo tone="clay" ratio="3/4" imageUrl={featured[0]?.imageUrl} alt={featured[0]?.name} caption={featured[0] ? `Depois · ${featured[0].sku}` : "Depois · prova virtual"}/>
          </div>
        </div>
      </section>

      {/* Modals */}
      {b2bOpen    && <B2BModal onClose={() => setB2bOpen(false)} />}
      {tryOnOpen  && <TryOnModal onClose={() => setTryOnOpen(false)} products={allProducts} />}
      {howOpen    && <HowItWorksModal onClose={() => setHowOpen(false)} />}
    </main>
  );
}

// ── B2B Registration Modal ───────────────────────────────────────────────────

function B2BModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    company_name: "", cnpj: "", state_registration: "",
    contact_name: "", email: "", phone: "",
    zip_code: "", street: "", number: "", complement: "", neighborhood: "",
    city: "", state: "",
  });
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiClient.post("/api/v1/leads", { lead: form });
      setSuccess(true);
    } catch {
      setError("Não foi possível enviar o cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        {success ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h2 className="display" style={{ fontSize: 36, marginBottom: 12 }}>Cadastro enviado!</h2>
            <p style={{ fontSize: 14, color: "var(--brand-muted)", lineHeight: 1.6, marginBottom: 24 }}>
              Recebemos seus dados. Nossa equipe entrará em contato em até 24h para liberar seu acesso.
            </p>
            <Btn variant="primary" onClick={onClose}>Fechar</Btn>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 28 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Cadastro B2B</div>
              <h2 className="display" style={{ fontSize: 36 }}>Abra sua conta lojista</h2>
              <p style={{ fontSize: 13, color: "var(--brand-muted)", marginTop: 8, lineHeight: 1.55 }}>
                Preencha os dados da sua empresa. Aprovação em até 24h.
              </p>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <FormRow>
                <FormField label="Nome da empresa" required>
                  <input style={inputStyle} value={form.company_name} onChange={set("company_name")} required placeholder="Ex: Boutique das Flores Ltda"/>
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="CNPJ" required>
                  <input style={inputStyle} value={form.cnpj} onChange={set("cnpj")} required placeholder="00.000.000/0001-00"/>
                </FormField>
                <FormField label="Inscrição Estadual">
                  <input style={inputStyle} value={form.state_registration} onChange={set("state_registration")} placeholder="Isento ou número"/>
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="Nome do responsável" required>
                  <input style={inputStyle} value={form.contact_name} onChange={set("contact_name")} required placeholder="Nome completo"/>
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="E-mail" required>
                  <input style={inputStyle} type="email" value={form.email} onChange={set("email")} required placeholder="contato@empresa.com"/>
                </FormField>
                <FormField label="WhatsApp" required>
                  <input style={inputStyle} type="tel" value={form.phone} onChange={set("phone")} required placeholder="(11) 90000-0000"/>
                </FormField>
              </FormRow>

              {/* Endereço completo */}
              <div style={{ borderTop: "1px solid var(--brand-border)", paddingTop: 14, marginTop: 4 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-muted)", marginBottom: 12 }}>Endereço</div>
              </div>
              <FormRow>
                <FormField label="CEP" required>
                  <input style={inputStyle} value={form.zip_code} onChange={set("zip_code")} required placeholder="00000-000"/>
                </FormField>
                <FormField label="Bairro" required>
                  <input style={inputStyle} value={form.neighborhood} onChange={set("neighborhood")} required placeholder="Centro"/>
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="Rua / Avenida" required>
                  <input style={inputStyle} value={form.street} onChange={set("street")} required placeholder="Rua das Flores"/>
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="Número" required>
                  <input style={inputStyle} value={form.number} onChange={set("number")} required placeholder="123"/>
                </FormField>
                <FormField label="Complemento">
                  <input style={inputStyle} value={form.complement} onChange={set("complement")} placeholder="Sala 4, Apto 2..."/>
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="Cidade" required>
                  <input style={inputStyle} value={form.city} onChange={set("city")} required placeholder="São Paulo"/>
                </FormField>
                <FormField label="Estado" required>
                  <select style={inputStyle} value={form.state} onChange={set("state")} required>
                    <option value="">Selecione</option>
                    {["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </FormField>
              </FormRow>
              {error && <p style={{ fontSize: 13, color: "#c0392b" }}>{error}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <Btn variant="outline" onClick={onClose} disabled={loading}>Cancelar</Btn>
                <Btn variant="primary" disabled={loading}>
                  {loading ? "Enviando…" : "Enviar cadastro"}
                </Btn>
              </div>
            </form>
          </>
        )}
      </div>
    </Overlay>
  );
}

// ── Virtual Try-On Modal ─────────────────────────────────────────────────────

function TryOnModal({ onClose, products }: { onClose: () => void; products: Product[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [colorIdx, setColorIdx]   = useState(0);
  const [size, setSize]           = useState("M");
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<string | null>(null);

  const product = products.find((p) => p.id === productId) ?? products[0];

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setResult(null);
  }

  function handleGenerate() {
    if (!preview) return;
    setLoading(true);
    // Simulate AI processing — in production this calls the backend AI service
    setTimeout(() => {
      setLoading(false);
      setResult(product?.imageUrl ?? null);
    }, 2500);
  }

  return (
    <Overlay onClose={onClose} wide>
      <div style={{ width: "100%", maxWidth: 760 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Provador virtual</div>
          <h2 className="display" style={{ fontSize: 36 }}>Experimente antes de pedir</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Left: upload + result */}
          <div>
            <div style={{ marginBottom: 12, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-muted)" }}>
              01 · Sua foto
            </div>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                aspectRatio: "3/4", background: "var(--brand-surface)", border: "2px dashed var(--brand-border)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                cursor: "pointer", overflow: "hidden", position: "relative",
              }}
            >
              {preview ? (
                <img src={loading ? preview : (result ?? preview)} alt="Prova virtual"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}/>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>+</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-muted)" }}>
                    Anexar foto de corpo
                  </div>
                  <div style={{ fontSize: 11, color: "var(--brand-muted)", marginTop: 6 }}>JPG, PNG · máx. 10 MB</div>
                </>
              )}
              {loading && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                  <div style={{ color: "white", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em" }}>GERANDO…</div>
                  <div style={{ width: 120, height: 2, background: "rgba(255,255,255,0.2)", borderRadius: 1, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "white", animation: "progress-bar 2.5s linear", borderRadius: 1 }}/>
                  </div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile}/>
            {preview && !loading && (
              <button onClick={() => { setPreview(null); setResult(null); }} style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-muted)", textDecoration: "underline" }}>
                Trocar foto
              </button>
            )}
          </div>

          {/* Right: product selector */}
          <div>
            <div style={{ marginBottom: 12, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-muted)" }}>
              02 · Peça
            </div>
            {/* Product thumbnail */}
            <div style={{ aspectRatio: "3/4", background: "var(--brand-surface)", overflow: "hidden", marginBottom: 16 }}>
              {product?.imageUrl
                ? <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}/>
                : <div style={{ width: "100%", height: "100%", background: TONE[product?.colors[0]?.tone ?? "sand"]?.bg ?? "#e5e0db" }}/>
              }
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-muted)", display: "block", marginBottom: 6 }}>Peça</label>
              <select value={productId} onChange={(e) => { setProductId(e.target.value); setColorIdx(0); setResult(null); }} style={{ ...inputStyle, width: "100%" }}>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {product && product.colors.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-muted)", marginBottom: 8 }}>Cor</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {product.colors.map((c, i) => (
                    <button key={c.id} onClick={() => setColorIdx(i)} title={c.name}
                      style={{
                        width: 24, height: 24, borderRadius: 999,
                        background: c.hex ?? TONE[c.tone]?.bg ?? "#ccc",
                        border: i === colorIdx ? "2px solid var(--brand-foreground)" : "1px solid var(--brand-border)",
                        outline: i === colorIdx ? "2px solid white" : "none",
                        outlineOffset: -3,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-muted)", marginBottom: 8 }}>Tamanho</div>
              <div style={{ display: "flex", gap: 6 }}>
                {["PP", "P", "M", "G", "GG"].map((s) => {
                  const avail = !product || product.sizes.length === 0 || product.sizes.includes(s);
                  return (
                    <button key={s} onClick={() => avail && setSize(s)} disabled={!avail}
                      className="mono"
                      style={{
                        padding: "6px 10px", fontSize: 11, letterSpacing: "0.06em",
                        border: "1px solid " + (size === s ? "var(--brand-foreground)" : "var(--brand-border)"),
                        background: size === s ? "var(--brand-foreground)" : "transparent",
                        color: size === s ? "white" : avail ? "var(--brand-foreground)" : "var(--brand-muted)",
                        opacity: avail ? 1 : 0.35,
                      }}
                    >{s}</button>
                  );
                })}
              </div>
            </div>

            <Btn variant="primary" disabled={!preview || loading} onClick={handleGenerate} style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Gerando prova…" : "Gerar prova virtual"}
            </Btn>
            {!preview && <p style={{ fontSize: 11, color: "var(--brand-muted)", marginTop: 8, textAlign: "center" }}>Anexe uma foto de corpo para continuar</p>}
          </div>
        </div>
      </div>
    </Overlay>
  );
}

// ── How It Works Modal ───────────────────────────────────────────────────────

function HowItWorksModal({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      n: "01",
      title: "Abra qualquer peça do catálogo",
      desc: "Navegue pelo catálogo e clique na peça que deseja mostrar para sua cliente. Você precisa estar logada como lojista para acessar o detalhe do produto.",
    },
    {
      n: "02",
      title: "Clique em "Provar no corpo"",
      desc: "No detalhe da peça, o botão de provador virtual abre o painel de experimentação. Selecione a cor e o tamanho desejados antes de gerar a prova.",
    },
    {
      n: "03",
      title: "Envie uma foto de corpo inteiro",
      desc: "Use o botão \"Anexar foto de corpo\" e selecione uma imagem da sua cliente (ou manequim). Aceita JPG ou PNG de até 10 MB. A foto deve mostrar o corpo inteiro, de frente, em boa iluminação, de preferência com roupa de cor sólida clara.",
    },
    {
      n: "04",
      title: "Gere a prova virtual",
      desc: "Clique em \"Gerar prova virtual\". A IA renderiza a peça no corpo em segundos, ajustando cor, caimento e proporção ao tamanho selecionado. O resultado aparece ao lado da foto original.",
    },
    {
      n: "05",
      title: "Troque cor ou tamanho sem refazer",
      desc: "Não precisa fazer nova foto. Mude a cor ou o tamanho no painel e gere uma nova prova — a foto de corpo é reutilizada. Compare diferentes opções antes de fechar o pedido.",
    },
    {
      n: "06",
      title: "Compartilhe com sua cliente",
      desc: "Baixe o resultado ou envie direto pelo WhatsApp. A cliente vê como a peça fica no corpo dela antes de confirmar a compra, reduzindo devoluções e acelerando o fechamento.",
    },
  ];

  return (
    <Overlay onClose={onClose} wide>
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div style={{ marginBottom: 32 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Provador Virtual · Passo a passo</div>
          <h2 className="display" style={{ fontSize: 44 }}>Como funciona</h2>
          <p style={{ fontSize: 14, color: "var(--brand-muted)", marginTop: 12, lineHeight: 1.6 }}>
            Mostre para sua cliente como a peça fica no corpo dela — antes de fazer o pedido.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{
              display: "grid", gridTemplateColumns: "48px 1fr",
              gap: 20, paddingBottom: 28,
              borderBottom: i < steps.length - 1 ? "1px solid var(--brand-border)" : "none",
              marginBottom: i < steps.length - 1 ? 28 : 0,
            }}>
              <div>
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--brand-muted)", marginBottom: 4 }}>{s.n}</div>
                <div style={{ width: 1, height: "100%", background: "var(--brand-border)", margin: "0 auto" }}/>
              </div>
              <div>
                <h3 className="display" style={{ fontSize: 24, marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: "var(--brand-muted)", lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 32, padding: "20px 24px", background: "var(--brand-surface)", fontSize: 13, color: "var(--brand-muted)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--brand-foreground)" }}>Dica:</strong> a foto ideal é de corpo inteiro, de frente, em fundo neutro e boa iluminação. Evite poses com braços levantados ou roupas com estampa muito carregada para um resultado mais preciso.
        </div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <Btn variant="primary" onClick={onClose}>Entendido</Btn>
        </div>
      </div>
    </Overlay>
  );
}

// ── Shared helpers ───────────────────────────────────────────────────────────

function Overlay({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(10,10,10,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}
      onClick={onClose}
    >
      <div
        style={{ background: "white", padding: wide ? 48 : 40, width: "100%", maxWidth: wide ? 820 : 560, maxHeight: "90vh", overflowY: "auto", position: "relative" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, cursor: "pointer", opacity: 0.5 }}>
          <Icons.X/>
        </button>
        {children}
      </div>
    </div>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>{children}</div>;
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-muted)" }}>
        {label}{required && <span style={{ color: "var(--brand-primary)" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid var(--brand-border)",
  background: "var(--brand-surface)",
  fontFamily: "var(--font-sans, inherit)",
  fontSize: 13,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
