import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Photo, Btn } from "@/components/showroom/primitives";
import { Icons } from "@/components/showroom/icons";
import { TONE, brl } from "@/data/catalog";
import { useProducts, useCollections, useCategories } from "@/hooks/useCatalog";
import { useCartStore } from "@/stores/useCartStore";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Product, CartItem } from "@/types/catalog";

export default function Catalog() {
  const navigate      = useNavigate();
  const addToCart     = useCartStore((s) => s.add);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const requireAuth = (action: () => void) => {
    if (!isAuthenticated) { navigate("/login"); return; }
    action();
  };
  const [cat, setCat]             = useState("all");
  const [collection, setCollection] = useState("all");
  const [view, setView]           = useState<"grid" | "wholesale">("grid");
  const [sort, setSort]           = useState("featured");
  const [openQuickAdd, setOpenQuickAdd] = useState<string | null>(null);

  const { data: products = [], isLoading } = useProducts();
  const { data: collections = [] }         = useCollections();
  const { data: categories = [] }          = useCategories();

  const allCategories = useMemo(() => {
    const counts = products.reduce<Record<string, number>>((acc, p) => {
      if (p.category) acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    }, {});
    return [
      { id: "all", label: "Tudo", count: products.length },
      ...categories.map((c) => ({ ...c, count: counts[c.id] ?? 0 })),
    ];
  }, [products, categories]);

  const filtered = useMemo(() => {
    let list = products.filter((p) =>
      (cat === "all" || p.category === cat) &&
      (collection === "all" || p.collection === collection)
    );
    if (sort === "price-asc")  list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, cat, collection, sort]);

  return (
    <main>
      {/* Cabeçalho */}
      <section className="sr-catalog-section-header" style={{ padding: "48px 32px 32px", borderBottom: "1px solid var(--brand-border)" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div className="sr-catalog-header-row">
            <div>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Mostruário</div>
              <h1 className="display sr-catalog-title">Catálogo</h1>
            </div>
            <div className="sr-catalog-view-toggle">
              <div className="mono" style={{ fontSize: 11, color: "var(--brand-muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Visualização</div>
              <div style={{ display: "inline-flex", marginTop: 8, border: "1px solid var(--brand-border)" }}>
                <button onClick={() => setView("grid")} style={viewBtn(view === "grid")}>
                  <Icons.Grid/> Editorial
                </button>
                <button onClick={() => setView("wholesale")} style={viewBtn(view === "wholesale")}>
                  <Icons.List/> Wholesale
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Barra de filtros */}
      <section className="sr-filter-bar-sticky" style={{ padding: "0 32px", borderBottom: "1px solid var(--brand-border)", position: "sticky", top: 83, background: "white", zIndex: 10 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div className="sr-filter-bar">
            <div className="sr-filter-chips">
              {allCategories.map((c) => (
                <button key={c.id} onClick={() => setCat(c.id)} style={chip(cat === c.id)}>
                  {c.label} <span style={{ opacity: 0.4 }}>{c.count}</span>
                </button>
              ))}
            </div>
            <div className="sr-filter-selects">
              <select value={collection} onChange={(e) => setCollection(e.target.value)} style={sel}>
                <option value="all">Todas coleções</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)} style={sel}>
                <option value="featured">Destaques</option>
                <option value="price-asc">Preço ↑</option>
                <option value="price-desc">Preço ↓</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Produtos */}
      <section className="sr-catalog-body" style={{ padding: "32px 32px 96px" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          {isLoading ? (
            <div className="sr-product-grid-loading">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ aspectRatio: "3/4", background: "var(--brand-surface)", animation: "pulse 1.5s infinite" }}/>
              ))}
            </div>
          ) : view === "grid" ? (
            <div className="sr-product-grid">
              {filtered.map((p) => (
                <ProductCard key={p.id} p={p}
                  onOpen={() => requireAuth(() => navigate(`/product/${p.id}`))}
                  onQuickAdd={() => requireAuth(() => setOpenQuickAdd(p.id))}/>
              ))}
            </div>
          ) : (
            <WholesaleTable products={filtered}
              addToCart={(item) => requireAuth(() => addToCart(item))}
              onOpen={(id) => requireAuth(() => navigate(`/product/${id}`))}/>
          )}
        </div>
      </section>

      {openQuickAdd && (
        <QuickAddDrawer productId={openQuickAdd} products={products} onClose={() => setOpenQuickAdd(null)} addToCart={addToCart}/>
      )}
    </main>
  );
}

const viewBtn = (active: boolean): React.CSSProperties => ({
  padding: "8px 14px", fontFamily: "var(--font-mono)", fontSize: 11,
  letterSpacing: "0.12em", textTransform: "uppercase",
  display: "inline-flex", alignItems: "center", gap: 8,
  background: active ? "var(--brand-foreground)" : "white",
  color: active ? "white" : "var(--brand-foreground)",
});
const chip = (active: boolean): React.CSSProperties => ({
  padding: "8px 14px", fontFamily: "var(--font-mono)", fontSize: 11,
  letterSpacing: "0.1em", textTransform: "uppercase",
  background: active ? "var(--brand-foreground)" : "transparent",
  color: active ? "white" : "var(--brand-foreground)",
  border: "1px solid " + (active ? "var(--brand-foreground)" : "var(--brand-border)"),
  whiteSpace: "nowrap",
});
const sel: React.CSSProperties = {
  border: "1px solid var(--brand-border)", padding: "8px 12px",
  fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em",
  textTransform: "uppercase", background: "white",
};

function ProductCard({ p, onOpen, onQuickAdd }: { p: Product; onOpen: () => void; onQuickAdd: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [colorIdx, setColorIdx] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);

  const images = p.images ?? [];
  const hasCarousel = images.length > 1;

  const currentSrc =
    images.length > 0
      ? (images[imgIdx]?.urls?.regular ?? images[imgIdx]?.urls?.small ?? images[imgIdx]?.urls?.thumb ?? p.imageUrl)
      : p.imageUrl;

  const currentAlt =
    images.length > 0 ? (images[imgIdx]?.alt_text ?? p.name) : p.name;

  function prevImg(e: React.MouseEvent) {
    e.stopPropagation();
    setImgIdx((i) => (i - 1 + images.length) % images.length);
  }

  function nextImg(e: React.MouseEvent) {
    e.stopPropagation();
    setImgIdx((i) => (i + 1) % images.length);
  }

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ position: "relative" }}>
      {/* Foto / carrossel */}
      <div onClick={onOpen} style={{ display: "block", width: "100%", textAlign: "left", position: "relative", cursor: "pointer" }}>
        <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden", background: "var(--brand-surface)" }}>
          {currentSrc ? (
            <img
              src={currentSrc}
              alt={currentAlt ?? undefined}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: TONE[p.colors[colorIdx]?.tone ?? "sand"]?.bg ?? "#e5e0db" }}/>
          )}

          {/* Setas — apenas desktop (hover) */}
          {hasCarousel && hovered && (
            <button onClick={prevImg} style={{
              position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.85)", border: "none", cursor: "pointer",
              fontSize: 18, padding: "4px 8px", lineHeight: 1,
            }}>‹</button>
          )}
          {hasCarousel && hovered && (
            <button onClick={nextImg} style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.85)", border: "none", cursor: "pointer",
              fontSize: 18, padding: "4px 8px", lineHeight: 1,
            }}>›</button>
          )}

          {/* Bolinhas de cor */}
          {p.colors.length > 0 && (
            <div style={{ position: "absolute", bottom: 10, left: 8, display: "flex", alignItems: "center", zIndex: 3 }}>
              {p.colors.slice(0, 4).map((c, i) => (
                <button
                  key={c.id}
                  onClick={(e) => { e.stopPropagation(); setColorIdx(i); }}
                  title={c.name}
                  style={{
                    width: 18, height: 18, borderRadius: 999, flexShrink: 0,
                    background: c.hex ?? TONE[c.tone]?.bg ?? "#ccc",
                    border: "2px solid white",
                    marginLeft: i > 0 ? -5 : 0,
                    position: "relative", zIndex: 4 - i,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              ))}
              {p.colors.length > 4 && (
                <span style={{
                  marginLeft: 4, fontSize: 9, fontFamily: "var(--font-mono)",
                  background: "rgba(255,255,255,0.88)", borderRadius: 999,
                  padding: "1px 5px", color: "var(--brand-foreground)", fontWeight: 600,
                }}>+{p.colors.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* "Adicionar grade" ao hover (escondido no mobile, substituído pelo tap) */}
      {hovered && (
        <button onClick={onQuickAdd} className="sr-hide-mobile" style={{
          position: "absolute", bottom: 90, left: 12, right: 12,
          background: "white", color: "var(--brand-foreground)",
          padding: "12px", fontFamily: "var(--font-mono)", fontSize: 11,
          letterSpacing: "0.12em", textTransform: "uppercase",
          border: "1px solid var(--brand-foreground)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          zIndex: 2,
        }}>
          <span>Adicionar grade</span><Icons.Plus/>
        </button>
      )}

      {/* Botão de adicionar — sempre visível no mobile (abaixo da foto) */}
      <button onClick={onQuickAdd} className="sr-hide-desktop" style={{
        display: "flex",
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
        padding: "10px",
        marginTop: 4,
        background: "var(--brand-surface)",
        border: "1px solid var(--brand-border)",
        fontFamily: "var(--font-mono)", fontSize: 10,
        letterSpacing: "0.12em", textTransform: "uppercase",
        gap: 6,
      }}>
        <Icons.Plus size={12}/> Grade
      </button>

      {/* Info abaixo da foto */}
      <div style={{ padding: "14px 2px 8px" }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>{p.name}</div>
          <div className="mono" style={{ fontSize: 10, color: "var(--brand-muted)", marginTop: 2 }}>{p.sku ?? p.id}</div>
          <div className="mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{brl(p.price)}</div>
        </div>

        {p.sizes.length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {p.sizes.map((s) => (
              <span key={s} className="mono" style={{
                fontSize: 11, padding: "5px 9px", letterSpacing: "0.06em",
                border: "1px solid var(--brand-foreground)",
                color: "var(--brand-foreground)",
                background: "white",
              }}>
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const WHOLESALE_SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XGG", "Único"];

function WholesaleTable({ products, addToCart, onOpen }: {
  products: Product[];
  addToCart: (item: CartItem) => void;
  onOpen: (id: string) => void;
}) {
  const allSizes = useMemo(() => {
    const seen = new Set(products.flatMap((p) => p.sizes));
    return WHOLESALE_SIZE_ORDER.filter((s) => seen.has(s)).concat(
      [...seen].filter((s) => !WHOLESALE_SIZE_ORDER.includes(s))
    );
  }, [products]);

  return (
    <div className="sr-wholesale-table">
      {/* Cabeçalho — visível apenas no desktop via CSS */}
      <div className="sr-wholesale-header" style={{
        gridTemplateColumns: `80px 2fr 1.5fr repeat(${allSizes.length}, 60px) 80px 120px`,
        color: "var(--brand-muted)",
      }}>
        <span>SKU</span><span>Peça</span><span>Cores</span>
        {allSizes.map((s) => <span key={s} style={{ textAlign: "center" }}>{s}</span>)}
        <span style={{ textAlign: "right" }}>R$</span>
        <span style={{ textAlign: "right" }}>Ação</span>
      </div>
      {products.map((p) => <WholesaleRow key={p.id} p={p} allSizes={allSizes} addToCart={addToCart} onOpen={onOpen}/>)}
    </div>
  );
}

function WholesaleRow({ p, allSizes, addToCart, onOpen }: { p: Product; allSizes: string[]; addToCart: (item: CartItem) => void; onOpen: (id: string) => void }) {
  const [qty, setQty] = useState<Record<string, number>>(Object.fromEntries(allSizes.map((s) => [s, 0])));
  const [colorId, setColorId] = useState(p.colors[0]?.id ?? "");
  const total = Object.values(qty).reduce((a, b) => a + b, 0);
  return (
    <div className="sr-wholesale-row" style={{
      gridTemplateColumns: `80px 2fr 1.5fr repeat(${allSizes.length}, 60px) 80px 120px`,
    }}>
      {/* SKU */}
      <button onClick={() => onOpen(p.id)} className="mono sr-wholesale-cell-sku" style={{ fontSize: 11, letterSpacing: "0.08em", textAlign: "left", color: "var(--brand-muted)" }}>
        {p.sku ?? p.id}
      </button>

      {/* Nome + foto */}
      <button onClick={() => onOpen(p.id)} style={{ display: "flex", gap: 12, alignItems: "center", textAlign: "left" }}>
        <div style={{ width: 40, height: 52, flexShrink: 0, overflow: "hidden" }}>
          {p.imageUrl
            ? <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}/>
            : <div style={{ width: "100%", height: "100%", background: TONE[p.colors[0]?.tone ?? "sand"]?.bg ?? "#ccc" }}/>
          }
        </div>
        <div>
          <div style={{ fontWeight: 500 }}>{p.name}</div>
          <div style={{ fontSize: 11, color: "var(--brand-muted)" }}>{p.collection}</div>
          {/* Preço visível mobile (dentro do card) */}
          <div className="mono sr-hide-desktop" style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{brl(p.price)}</div>
        </div>
      </button>

      {/* Cores */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {p.colors.map((c) => (
          <button key={c.id} onClick={() => setColorId(c.id)} title={c.name} style={{
            width: 22, height: 22, borderRadius: 999, flexShrink: 0,
            background: c.hex ?? TONE[c.tone]?.bg ?? "#ccc",
            boxShadow: colorId === c.id
              ? "0 0 0 2px white, 0 0 0 3.5px var(--brand-foreground)"
              : "0 0 0 1px rgba(0,0,0,0.15)",
          }}/>
        ))}
      </div>

      {/* Inputs de qtd por tamanho */}
      {allSizes.map((s) => {
        const available = p.sizes.includes(s);
        return (
          <div key={s} className="sr-wholesale-sizes-row" style={{ display: "flex", justifyContent: "center" }}>
            <input type="number" min={0} value={available ? qty[s] : ""} disabled={!available}
              onChange={(e) => setQty({ ...qty, [s]: Math.max(0, parseInt(e.target.value || "0")) })}
              style={{ width: 44, height: 32, textAlign: "center", border: "1px solid var(--brand-border)", background: available ? "white" : "var(--brand-surface)", fontFamily: "var(--font-mono)", fontSize: 12 }}/>
          </div>
        );
      })}

      {/* Preço desktop */}
      <div className="mono sr-hide-mobile" style={{ textAlign: "right", fontWeight: 500 }}>{brl(p.price)}</div>

      {/* Ação */}
      <div className="sr-wholesale-actions-row" style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn size="sm" variant={total > 0 ? "primary" : "subtle"} disabled={total === 0}
          onClick={() => { addToCart({ ...p, colorId, qty, total }); setQty(Object.fromEntries(allSizes.map((s) => [s, 0]))); }}>
          {total ? `+${total}` : "Adicionar"}
        </Btn>
      </div>
    </div>
  );
}

function QuickAddDrawer({ productId, products, onClose, addToCart }: {
  productId: string;
  products: Product[];
  onClose: () => void;
  addToCart: (item: CartItem) => void;
}) {
  const p = products.find((x) => x.id === productId) ?? products[0];
  if (!p) return null;
  const [colorId, setColorId] = useState(p.colors[0]?.id ?? "");
  const [qty, setQty] = useState<Record<string, number>>(Object.fromEntries(p.sizes.map((s) => [s, 0])));
  const total = Object.values(qty).reduce((a, b) => a + b, 0);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.4)", zIndex: 100, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sr-quick-add-drawer" style={{ background: "white", height: "100%", padding: 32, overflow: "auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="eyebrow">Grade rápida · {p.sku ?? p.id}</div>
          <button onClick={onClose}><Icons.X/></button>
        </div>
        <Photo
          tone={p.colors.find((c) => c.id === colorId)?.tone ?? "sand"}
          ratio="4/5"
          imageUrl={p.imageUrl}
          alt={p.name}
          caption={p.name}
        />
        <div>
          <div className="display" style={{ fontSize: 32 }}>{p.name}</div>
          <div className="mono" style={{ fontSize: 14, marginTop: 4 }}>{brl(p.price)}</div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Cor · {p.colors.find((c) => c.id === colorId)?.name}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {p.colors.map((c) => (
              <button key={c.id} onClick={() => setColorId(c.id)} title={c.name} style={{
                width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                background: c.hex ?? TONE[c.tone]?.bg ?? "#ccc",
                boxShadow: colorId === c.id
                  ? "0 0 0 2px white, 0 0 0 3.5px var(--brand-foreground)"
                  : "0 0 0 1px rgba(0,0,0,0.15)",
              }}/>
            ))}
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Grade de tamanhos</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(p.sizes.length, 3)}, 1fr)`, gap: 4 }}>
            {p.sizes.map((s) => (
              <div key={s} style={{ border: "1px solid var(--brand-border)", padding: 12, textAlign: "center" }}>
                <div className="mono" style={{ fontSize: 12, color: "var(--brand-muted)", marginBottom: 8 }}>{s}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <button onClick={() => setQty({ ...qty, [s]: Math.max(0, qty[s] - 1) })}><Icons.Minus/></button>
                  <input value={qty[s]} onChange={(e) => setQty({ ...qty, [s]: Math.max(0, parseInt(e.target.value || "0")) })}
                    style={{ width: 36, textAlign: "center", border: 0, fontFamily: "var(--font-mono)" }}/>
                  <button onClick={() => setQty({ ...qty, [s]: qty[s] + 1 })}><Icons.Plus/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: "auto", borderTop: "1px solid var(--brand-border)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="mono" style={{ fontSize: 11, color: "var(--brand-muted)" }}>{total} peças · {brl(total * p.price)}</div>
            <div style={{ fontSize: 11, color: "var(--brand-muted)", marginTop: 4 }}>{total} peças selecionadas</div>
          </div>
          <Btn variant="primary" disabled={total === 0}
            onClick={() => { addToCart({ ...p, colorId, qty, total }); onClose(); }}>
            Adicionar ao pedido
          </Btn>
        </div>
      </div>
    </div>
  );
}
