import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Photo, Btn } from "@/components/showroom/primitives";
import { LOOKBOOK, PRODUCTS, brl, TONE } from "@/data/catalog";
import { useLooks, useLook } from "@/hooks/useCatalog";
import { Icons } from "@/components/showroom/icons";
import type { Look, LookProduct } from "@/types/catalog";

export default function Lookbook() {
  const navigate = useNavigate();
  const { data: apiLooks = [], isLoading } = useLooks();

  // If API has looks, show the dynamic view; otherwise fall back to static editorial
  if (!isLoading && apiLooks.length > 0) {
    return <DynamicLookbook looks={apiLooks} />;
  }

  if (!isLoading && apiLooks.length === 0) {
    return <StaticLookbook navigate={navigate} />;
  }

  return <LoadingSkeleton />;
}

// ── Dynamic Lookbook (API data) ───────────────────────────────────────────────

function DynamicLookbook({ looks }: { looks: Look[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  return (
    <main>
      <section style={{ padding: "72px 48px 48px", borderBottom: "1px solid var(--brand-border)" }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--brand-muted)", marginBottom: 16 }}>
          Composições editoriais · {looks.length} {looks.length === 1 ? "história" : "histórias"}
        </div>
        <h1 className="display" style={{ fontSize: "clamp(56px, 8vw, 120px)", fontStyle: "italic", lineHeight: 0.9 }}>
          Lookbook.
        </h1>
        <p style={{ marginTop: 24, maxWidth: 480, color: "var(--brand-muted)", fontSize: 14, lineHeight: 1.6 }}>
          Looks montados para inspirar seus clientes. Cada composição mostra como as peças se combinam na prática.
        </p>
      </section>

      <section style={{ padding: "2px", background: "var(--brand-border)" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 2,
          background: "var(--brand-border)",
        }}>
          {looks.map((look, i) => (
            <LookCard key={look.id} look={look} index={i} onClick={() => setSelectedSlug(look.id)} />
          ))}
        </div>
      </section>

      {selectedSlug && (
        <LookModal slug={selectedSlug} onClose={() => setSelectedSlug(null)} />
      )}
    </main>
  );
}

// ── Look card ─────────────────────────────────────────────────────────────────

function LookCard({ look, index, onClick }: { look: Look; index: number; onClick: () => void }) {
  const toneKeys = Object.keys(TONE);
  const tone = TONE[toneKeys[index % toneKeys.length]] ?? TONE.sand;

  return (
    <button onClick={onClick} style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", background: "transparent", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "relative", aspectRatio: "3/4", background: tone.bg, overflow: "hidden" }}>
        {look.coverUrl ? (
          <img src={look.coverUrl} alt={look.name} loading="lazy"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ opacity: 0.12, color: tone.fg, fontFamily: "var(--font-display)", fontSize: 80, fontStyle: "italic" }}>
              {String(index + 1).padStart(2, "0")}
            </div>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 20px", color: "white" }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.75, marginBottom: 6 }}>
            {look.collectionName ?? "Lookbook"} · {look.productCount} {look.productCount === 1 ? "peça" : "peças"}
          </div>
          <div className="display" style={{ fontSize: 22, fontStyle: "italic" }}>{look.name}</div>
        </div>
        <div className="mono" style={{ position: "absolute", top: 16, right: 16, fontSize: 10, letterSpacing: "0.1em", color: "rgba(255,255,255,0.45)" }}>
          {String(index + 1).padStart(2, "0")}
        </div>
      </div>
    </button>
  );
}

// ── Look detail modal ─────────────────────────────────────────────────────────

function LookModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { data: look, isLoading } = useLook(slug);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.6)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 1100, background: "var(--brand-background)", maxHeight: "92vh", display: "flex", flexDirection: "column", borderRadius: "12px 12px 0 0", overflow: "hidden" }}
      >
        {/* Header */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--brand-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--brand-muted)" }}>
              {look?.collectionName ?? "Lookbook"}
            </div>
            <div className="display" style={{ fontSize: 26, fontStyle: "italic", marginTop: 2 }}>
              {isLoading ? "Carregando…" : look?.name}
            </div>
          </div>
          <button onClick={onClose}><Icons.X /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "32px 28px" }}>
          {look?.description && (
            <p style={{ marginBottom: 28, maxWidth: 560, color: "var(--brand-muted)", fontSize: 14, lineHeight: 1.6 }}>
              {look.description}
            </p>
          )}
          {isLoading ? (
            <ModalSkeleton />
          ) : look?.products && look.products.length > 0 ? (
            <LookProductGrid products={look.products} onClose={onClose} />
          ) : (
            <p className="mono" style={{ fontSize: 11, color: "var(--brand-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Nenhuma peça neste look ainda.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Product grid inside modal ─────────────────────────────────────────────────

function LookProductGrid({ products, onClose }: { products: LookProduct[]; onClose: () => void }) {
  const navigate = useNavigate();
  const toneKeys = Object.keys(TONE);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
      {products.map((p, i) => {
        const tone = TONE[toneKeys[i % toneKeys.length]] ?? TONE.sand;
        return (
          <button key={p.id} onClick={() => { onClose(); navigate(`/product/${p.id}`); }}
            style={{ display: "block", textAlign: "left", cursor: "pointer", background: "transparent" }}>
            <div style={{ aspectRatio: "3/4", background: tone.bg, position: "relative", overflow: "hidden", marginBottom: 10 }}>
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} loading="lazy"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.2, color: tone.fg }}>
                  <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                    <path d="M3 6l3-3h12l3 3M3 6v14a1 1 0 001 1h16a1 1 0 001-1V6M3 6h18" />
                  </svg>
                </div>
              )}
            </div>
            <div style={{ fontWeight: 500, fontSize: 13, lineHeight: 1.3 }}>{p.name}</div>
            {p.sku && <div className="mono" style={{ fontSize: 10, color: "var(--brand-muted)", marginTop: 2 }}>{p.sku}</div>}
            <div className="mono" style={{ fontSize: 11, marginTop: 4, color: "var(--brand-primary)" }}>{brl(p.price)}</div>
            {p.colors.length > 0 && (
              <div className="mono" style={{ fontSize: 10, color: "var(--brand-muted)", marginTop: 2 }}>
                {p.colors.slice(0, 3).join(" · ")}{p.colors.length > 3 ? ` +${p.colors.length - 3}` : ""}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Static Lookbook (fallback when no API looks) ──────────────────────────────

function StaticLookbook({ navigate }: { navigate: (path: string) => void }) {
  const [active, setActive] = useState(0);
  const book = LOOKBOOK[active];

  return (
    <main>
      <section style={{ padding: "48px 32px 0" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Editorial · {LOOKBOOK.length} histórias</div>
          <h1 className="display" style={{ fontSize: 120, lineHeight: 0.9 }}>Lookbook<em>.</em></h1>
          <div style={{ display: "flex", gap: 32, marginTop: 32, borderBottom: "1px solid var(--brand-border)" }}>
            {LOOKBOOK.map((l, i) => (
              <button key={l.id} onClick={() => setActive(i)} style={{
                paddingBottom: 16, fontFamily: "var(--font-mono)", fontSize: 12,
                letterSpacing: "0.12em", textTransform: "uppercase",
                borderBottom: "1px solid " + (active === i ? "var(--brand-foreground)" : "transparent"),
                color: active === i ? "var(--brand-foreground)" : "var(--brand-muted)",
              }}>0{i + 1} · {l.title}</button>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "64px 32px" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 2fr", gap: 64 }}>
          <div style={{ position: "sticky", top: 130, alignSelf: "start" }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--brand-muted)" }}>
              Capítulo 0{active + 1}
            </div>
            <h2 className="display" style={{ fontSize: 88, lineHeight: 0.95, margin: "16px 0 24px" }}>
              {book.title}<em>.</em>
            </h2>
            <p style={{ fontSize: 20, lineHeight: 1.4, color: "var(--brand-muted)" }}>{book.subtitle}</p>
            <div className="mono" style={{ fontSize: 11, marginTop: 32, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-muted)" }}>
              {book.season} · {book.shots} looks · Styling interno
            </div>
            <Btn variant="outline" style={{ marginTop: 32 }} onClick={() => navigate("/catalog")}>
              Ver peças da história →
            </Btn>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            {Array.from({ length: book.shots }).map((_, i) => {
              const spanTwo = i === 0 || i === 3;
              const tones = [book.tone, "cream", "noir"];
              return (
                <Photo key={i}
                  tone={i % 2 === 0 ? book.tone : tones[i % 3]}
                  ratio="3/4"
                  product={PRODUCTS[(i * 3) % PRODUCTS.length]}
                  view={(["front", "detail", "back", "movement"] as const)[i % 4]}
                  caption={`LOOK ${String(i + 1).padStart(2, "0")} · ${book.title}`}
                  style={{ gridColumn: spanTwo ? "span 2" : "auto", aspectRatio: spanTwo ? "3/2" : "3/4" }} />
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <main>
      <section style={{ padding: "72px 48px 48px", borderBottom: "1px solid var(--brand-border)" }}>
        <div style={{ width: 200, height: 12, background: "var(--brand-surface)", marginBottom: 16, borderRadius: 2 }} />
        <div style={{ width: 400, height: 80, background: "var(--brand-surface)", borderRadius: 2 }} />
      </section>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, padding: 2, background: "var(--brand-border)" }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{ aspectRatio: "3/4", background: "var(--brand-surface)" }} />
        ))}
      </div>
    </main>
  );
}

function ModalSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ aspectRatio: "3/4", background: "var(--brand-surface)", borderRadius: 2 }} />
      ))}
    </div>
  );
}
