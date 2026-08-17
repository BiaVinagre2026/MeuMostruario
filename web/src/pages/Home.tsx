import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/providers/TenantProvider";
import { Photo, Btn, Tag } from "@/components/showroom/primitives";
import { Icons } from "@/components/showroom/icons";
import { TIERS, TONE } from "@/data/catalog";
import { useProducts, useCollections } from "@/hooks/useCatalog";
import { PaymentModal } from "@/components/showroom/PaymentModal";
import { apiClient } from "@/lib/api/client";

export default function Home() {
  const navigate = useNavigate();
  const tenant = useTenant();
  const { data: allProducts = [] } = useProducts();
  const { data: collections = [] } = useCollections();


  const [b2bOpen, setB2bOpen]         = useState(false);
  const [howOpen, setHowOpen]         = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [isMobile, setIsMobile]       = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

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
      <section className="sr-hero" style={{ position: "relative", minHeight: 500 }}>
        {featured[0]?.imageUrl ? (
          <img
            src={
              featured[0].images?.[0]?.urls?.full ??
              featured[0].images?.[0]?.urls?.regular ??
              featured[0].imageUrl
            }
            alt={featured[0]?.name ?? "Hero"}
            fetchpriority="high"
            loading="eager"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "var(--brand-surface)" }}/>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 45%, transparent 100%)" }}/>
        <div className="sr-hero-content">
          <div className="sr-hero-inner">
            <div>
              <div className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.8, marginBottom: 24 }}>
                {collections[0]?.name ?? "Drop"} · {allProducts.length > 0 ? `${allProducts.length} peças` : "Mostruário"}
              </div>
              <h1 className="display" style={{ fontSize: "clamp(44px, 9vw, 168px)", fontStyle: "italic", maxWidth: "9ch" }}>
                {tenant.tenantName ?? collections[0]?.name ?? "Mostruário"}.
              </h1>
              <div className="display" style={{ fontSize: "clamp(22px, 3vw, 44px)", marginTop: -8, opacity: 0.9 }}>
                Catálogo atacado da sua operação white-label.
              </div>
            </div>
            <div className="sr-hero-cta-col">
              <div className="mono" style={{ fontSize: 11, letterSpacing: "0.1em", opacity: 0.75, textAlign: "right" }}>
                Tenant isolado · Branding próprio · Pedido por link
              </div>
              <div style={{ display: "flex", gap: 10, width: "100%" }}>
                <Btn
                  variant="accent" size="lg"
                  onClick={() => navigate("/catalog")}
                  icon={<Icons.Arrow/>}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  Ver catálogo
                </Btn>
              </div>
            </div>
          </div>
        </div>
        <div className="sr-hero-index">
          Índice 01/{String(collections.length || 1).padStart(2, "0")} · {collections[0]?.name ?? "Drop"}
        </div>
      </section>

      {/* How it works */}
      <section style={{ borderTop: "1px solid var(--brand-border)", borderBottom: "1px solid var(--brand-border)" }}>
        <div className="sr-how-grid" style={{ gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)" }}>

          {/* 01 — Acesso B2B */}
          <button
            onClick={() => setB2bOpen(true)}
            className="sr-how-item"
            style={{ padding: "40px 32px", borderRight: "1px solid var(--brand-border)", textAlign: "left", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-surface)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div className="mono" style={{ fontSize: 11, color: "var(--brand-muted)", letterSpacing: "0.14em", marginBottom: 24 }}>01</div>
            <h3 className="display" style={{ fontSize: 28, marginBottom: 12 }}>Acesso B2B</h3>
            <p style={{ fontSize: 13, color: "var(--brand-muted)", lineHeight: 1.55 }}>
              Compradores autorizados entram no catálogo do tenant e seguem para pedido no atacado.
            </p>
            <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid var(--brand-foreground)", paddingBottom: 2 }}>
              Ver fluxo <Icons.Arrow/>
            </div>
          </button>

          {/* 02 — Pedido mínimo */}
          <div className="sr-how-item" style={{ padding: "40px 32px", borderRight: "1px solid var(--brand-border)" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--brand-muted)", letterSpacing: "0.14em", marginBottom: 24 }}>02</div>
            <h3 className="display" style={{ fontSize: 28, marginBottom: 12 }}>Pedido mínimo</h3>
            <p style={{ fontSize: 13, color: "var(--brand-muted)", lineHeight: 1.55 }}>
              Cada tenant pode operar sua política comercial sem abrir mão do mesmo motor de catálogo.
            </p>
          </div>

          {/* 03 — Grade flexível */}
          <div className="sr-how-item" style={{ padding: "40px 32px", borderRight: "1px solid var(--brand-border)" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--brand-muted)", letterSpacing: "0.14em", marginBottom: 24 }}>03</div>
            <h3 className="display" style={{ fontSize: 28, marginBottom: 12 }}>Grade flexível</h3>
            <p style={{ fontSize: 13, color: "var(--brand-muted)", lineHeight: 1.55 }}>
              Selecione tamanhos por cor e monte a grade da operação com rapidez no mobile e no desktop.
            </p>
          </div>

          {/* 04 — Pagamento */}
          <div className="sr-how-item" style={{ padding: "40px 32px" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--brand-muted)", letterSpacing: "0.14em", marginBottom: 24 }}>04</div>
            <h3 className="display" style={{ fontSize: 28, marginBottom: 12 }}>Pagamento</h3>
            <p style={{ fontSize: 13, color: "var(--brand-muted)", lineHeight: 1.55 }}>
              Cada tenant conecta o próprio gateway. O pedido fecha no link de atacado e o pagamento
              segue a política da operação.
            </p>
            <button
              onClick={() => setPaymentOpen(true)}
              style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-foreground)", borderBottom: "1px solid var(--brand-foreground)", paddingBottom: 2 }}
            >
              Consultar formas de pagamento <Icons.Arrow/>
            </button>
          </div>
        </div>
      </section>

      {/* Tabela de preços por volume */}
      <section style={{ padding: "32px 32px 36px", background: "var(--brand-surface)", borderBottom: "1px solid var(--brand-border)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div className="eyebrow" style={{ marginBottom: 10, textAlign: "center" }}>Quanto mais pedir, mais margem.</div>
          <div style={{ background: "white", border: "1px solid var(--brand-border)" }}>
            {TIERS.map((t, i) => (
              <div key={i} className="sr-tiers-row" style={{
                borderBottom: i < TIERS.length - 1 ? "1px solid var(--brand-border)" : "none",
              }}>
                <span className="mono" style={{ fontSize: 10, color: "var(--brand-muted)" }}>0{i + 1}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{t.label}</span>
                <span className="mono sr-tiers-pieces" style={{ fontSize: 12, color: "var(--brand-muted)" }}>
                  {t.min}{t.max ? `–${t.max}` : "+"} peças
                </span>
                <span className="display sr-tiers-discount" style={{ fontSize: 24, color: t.discount ? "var(--brand-primary)" : "var(--brand-foreground)", textAlign: "right" }}>
                  {t.discount ? `−${t.discount}%` : "base"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured products — carrossel horizontal */}
      <section className="sr-featured-section">
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div className="sr-featured-header">
            <div>
              <div className="eyebrow" style={{ marginBottom: 16 }}>Destaques do drop</div>
              <h2 className="display sr-featured-title" style={{ fontSize: "clamp(26px, 7vw, 72px)", lineHeight: 1.05 }}>{allProducts.length > 0 ? `${allProducts.length} peças` : "Destaques"}. <em>Saem primeiro.</em></h2>
            </div>
            <button onClick={() => navigate("/catalog")} style={{
              fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
              display: "inline-flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid var(--brand-foreground)", paddingBottom: 4,
            }}>Ver catálogo <Icons.Arrow/></button>
          </div>

          <div style={{ position: "relative" }}>
            {isMobile ? (
              /* Mobile: grid 2 colunas vertical, sem scroll horizontal */
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2,
                paddingRight: 16,
              }}>
                {featured.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/product/${p.id}`)}
                    style={{ textAlign: "left", display: "block" }}
                  >
                    <div style={{ position: "relative", aspectRatio: "4/5", overflow: "hidden", background: "var(--brand-surface)" }}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name}
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}/>
                      ) : (
                        <div style={{ position: "absolute", inset: 0, background: TONE[p.colors[0]?.tone ?? "sand"]?.bg ?? "#e5e0db" }}/>
                      )}
                      <div style={{ position: "absolute", bottom: 8, left: 8, fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "white", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                        {p.sku ?? p.id}
                      </div>
                    </div>
                    <div style={{ padding: "8px 2px" }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              /* Desktop: carrossel horizontal */
              <>
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
                      className="sr-featured-item"
                      style={{ textAlign: "left", scrollSnapAlign: "start", display: "block" }}
                    >
                      <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden", background: "var(--brand-surface)" }}>
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}/>
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
              </>
            )}
          </div>
        </div>
      </section>

      {/* Collections */}
      <section className="sr-collections-section" style={{ padding: "0 32px 56px" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Arquitetura da coleção</div>
          <h2 className="display sr-collections-title" style={{ fontSize: "clamp(24px, 6vw, 72px)", marginBottom: "clamp(16px, 3vw, 48px)", lineHeight: 1.1 }}>{collections.length || 3} {collections.length === 1 ? "linha" : "linhas"}. <em>Um atelier.</em></h2>
          <div className="sr-collections-grid">
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

      {/* Do lote de fotos ao link */}
      <section className="sr-tryon-section" style={{ background: "var(--brand-foreground)", color: "white", padding: "64px 32px" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div className="sr-tryon-grid">
            <div>
              <div className="eyebrow" style={{ color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>Da foto ao pedido</div>
              <h2 className="display sr-tryon-title">Suba o lote. <em>O catálogo</em> sai pronto.</h2>
              <p style={{ fontSize: 17, lineHeight: 1.55, color: "rgba(255,255,255,0.7)", marginTop: 32, maxWidth: 480 }}>
                Centenas de fotos de uma vez. A triagem sugere cor, Pantone, modelo e tamanho, você revisa
                em massa e gera dois links do mesmo catálogo: um sem preço para a cliente final, outro com
                preço e pedido para o lojista.
              </p>
              <div className="sr-tryon-actions">
                <Btn variant="accent" size="lg" onClick={() => navigate("/catalog")} icon={<Icons.Arrow/>}>Ver catálogo</Btn>
                <Btn variant="ghost" size="lg" style={{ color: "white", borderColor: "rgba(255,255,255,0.3)" }} onClick={() => setHowOpen(true)}>Como funciona</Btn>
              </div>
            </div>
            <div className="sr-tryon-photos" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              <Photo
                tone="sand" ratio="3/4"
                imageUrl={featured[0]?.imageUrl}
                alt={featured[0]?.name}
                caption="Chega no lote"
              />
              <Photo
                tone="clay" ratio="3/4"
                imageUrl={featured[1]?.imageUrl ?? featured[0]?.imageUrl}
                alt={featured[1]?.name ?? featured[0]?.name}
                caption="Sai classificada e no link"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Modals */}
      {b2bOpen      && <B2BModal onClose={() => setB2bOpen(false)} />}
      {howOpen      && <HowItWorksModal onClose={() => setHowOpen(false)} />}
      {paymentOpen  && <PaymentModal onClose={() => setPaymentOpen(false)} />}
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

// ── Como funciona ────────────────────────────────────────────────────────────

function HowItWorksModal({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      n: "01",
      title: "Suba o lote de fotos",
      desc: "No admin, em Fotos, arraste até 100 imagens de uma vez. Não precisa nomear nem organizar antes: o lote entra inteiro e o processamento começa sozinho.",
    },
    {
      n: "02",
      title: "A triagem sugere a classificação",
      desc: "Cada foto recebe uma sugestão de cor, Pantone, modelo e tamanho, com um índice de confiança. A sugestão é sempre um ponto de partida — nada é publicado sem alguém aprovar.",
    },
    {
      n: "03",
      title: "Revise em massa",
      desc: "As fotos vêm agrupadas por SKU e por modelo. Dá para selecionar um grupo inteiro, aplicar as sugestões de uma vez e filtrar pelas de baixa confiança, que são as que realmente pedem seu olho.",
    },
    {
      n: "04",
      title: "Vincule ao produto",
      desc: "Uma foto pode virar produto novo ou entrar em um que já existe. Várias fotos da mesma peça em cores diferentes ficam sob o mesmo produto, cada uma com sua cor e Pantone.",
    },
    {
      n: "05",
      title: "Monte o catálogo e gere os links",
      desc: "Escolha as fotos que entram e gere dois links do mesmo catálogo: o público, sem preço, que só registra interesse; e o de atacado, com preço, quantidade por tamanho e pedido.",
    },
    {
      n: "06",
      title: "Receba os pedidos",
      desc: "Interesses e pedidos chegam no admin do seu tenant. Cada pedido guarda o preço praticado no momento da compra, então mudar a tabela depois não altera o histórico.",
    },
  ];

  return (
    <Overlay onClose={onClose} wide>
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div style={{ marginBottom: 32 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Do lote ao pedido · Passo a passo</div>
          <h2 className="display" style={{ fontSize: 44 }}>Como funciona</h2>
          <p style={{ fontSize: 14, color: "var(--brand-muted)", marginTop: 12, lineHeight: 1.6 }}>
            Da foto sem nome no celular até o pedido do lojista, sem planilha no meio.
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
      className="sr-modal-overlay"
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(10,10,10,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}
      onClick={onClose}
    >
      <div
        className={`sr-modal-box${wide ? " sr-modal-box-wide" : ""}`}
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
