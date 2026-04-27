import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Photo, Btn } from "@/components/showroom/primitives";
import { Icons } from "@/components/showroom/icons";
import { PRODUCTS, CATEGORIES, COLLECTIONS, TONE, brl } from "@/data/catalog";
import { useCartStore } from "@/stores/useCartStore";
import type { Product, CartItem } from "@/types/catalog";

export default function Catalog() {
  const navigate = useNavigate();
  const addToCart = useCartStore((s) => s.add);
  const [cat, setCat] = useState("all");
  const [collection, setCollection] = useState("all");
  const [view, setView] = useState<"grid" | "wholesale">("grid");
  const [sort, setSort] = useState("featured");
  const [openQuickAdd, setOpenQuickAdd] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = PRODUCTS.filter(p =>
      (cat === "all" || p.category === cat) &&
      (collection === "all" || p.collection === collection)
    );
    if (sort === "price-asc")  list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "moq")        list = [...list].sort((a, b) => a.moq - b.moq);
    return list;
  }, [cat, collection, sort]);

  return (
    <main>
      <section style={{ padding: "48px 32px 32px", borderBottom: "1px solid var(--brand-border)" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Mostruário · Verão 26</div>
              <h1 className="display" style={{ fontSize: 88 }}>Catálogo</h1>
            </div>
            <div style={{ textAlign: "right" }}>
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

      <section style={{ padding: "0 32px", borderBottom: "1px solid var(--brand-border)", position: "sticky", top: 83, background: "white", zIndex: 10 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCat(c.id)} style={chip(cat === c.id)}>
                {c.label} <span style={{ opacity: 0.4 }}>{c.count}</span>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <select value={collection} onChange={e => setCollection(e.target.value)} style={sel}>
              <option value="all">Todas coleções</option>
              {COLLECTIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={sort} onChange={e => setSort(e.target.value)} style={sel}>
              <option value="featured">Destaques</option>
              <option value="price-asc">Preço ↑</option>
              <option value="price-desc">Preço ↓</option>
              <option value="moq">MOQ</option>
            </select>
          </div>
        </div>
      </section>

      <section style={{ padding: "32px 32px 96px" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          {view === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
              {filtered.map(p => (
                <ProductCard key={p.id} p={p}
                  onOpen={() => navigate(`/product/${p.id}`)}
                  onQuickAdd={() => setOpenQuickAdd(p.id)}/>
              ))}
            </div>
          ) : (
            <WholesaleTable products={filtered} addToCart={addToCart}
              onOpen={(id) => navigate(`/product/${id}`)}/>
          )}
        </div>
      </section>

      {openQuickAdd && (
        <QuickAddDrawer productId={openQuickAdd} onClose={() => setOpenQuickAdd(null)} addToCart={addToCart}/>
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
});
const sel: React.CSSProperties = {
  border: "1px solid var(--brand-border)", padding: "8px 12px",
  fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em",
  textTransform: "uppercase", background: "white",
};

function ProductCard({ p, onOpen, onQuickAdd }: { p: Product; onOpen: () => void; onQuickAdd: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [colorIdx, setColorIdx] = useState(0);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ position: "relative" }}>
      <button onClick={onOpen} style={{ display: "block", width: "100%", textAlign: "left" }}>
        <Photo tone={p.colors[colorIdx].tone} ratio="3/4" product={p} caption={p.id}/>
      </button>
      {hovered && (
        <button onClick={onQuickAdd} style={{
          position: "absolute", bottom: 80, left: 12, right: 12,
          background: "white", color: "var(--brand-foreground)",
          padding: "12px", fontFamily: "var(--font-mono)", fontSize: 11,
          letterSpacing: "0.12em", textTransform: "uppercase",
          border: "1px solid var(--brand-foreground)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>Adicionar grade</span><Icons.Plus/>
        </button>
      )}
      <div style={{ padding: "16px 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{p.name}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--brand-muted)", marginTop: 2 }}>{p.id}</div>
          </div>
          <div className="mono" style={{ fontSize: 14, fontWeight: 500 }}>{brl(p.price)}</div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center" }}>
          {p.colors.map((c, i) => (
            <button key={c.id} onClick={() => setColorIdx(i)}
              style={{
                width: 14, height: 14, borderRadius: 999,
                background: TONE[c.tone].bg,
                border: i === colorIdx ? "1px solid var(--brand-foreground)" : "1px solid var(--brand-border)",
                outline: i === colorIdx ? "1px solid white" : "none",
                outlineOffset: -3,
              }}/>
          ))}
          <span style={{ fontSize: 11, color: "var(--brand-muted)", marginLeft: "auto" }}>MOQ {p.moq}</span>
        </div>
      </div>
    </div>
  );
}

function WholesaleTable({ products, addToCart, onOpen }: {
  products: Product[];
  addToCart: (item: CartItem) => void;
  onOpen: (id: string) => void;
}) {
  const sizes = ["PP", "P", "M", "G", "GG"];
  return (
    <div style={{ border: "1px solid var(--brand-border)" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "80px 2fr 1.5fr repeat(5, 60px) 80px 120px",
        padding: "14px 20px", background: "var(--brand-surface)",
        fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "var(--brand-muted)",
        borderBottom: "1px solid var(--brand-border)",
      }}>
        <span>SKU</span><span>Peça</span><span>Cores</span>
        {sizes.map(s => <span key={s} style={{ textAlign: "center" }}>{s}</span>)}
        <span style={{ textAlign: "right" }}>R$</span>
        <span style={{ textAlign: "right" }}>Ação</span>
      </div>
      {products.map(p => <WholesaleRow key={p.id} p={p} addToCart={addToCart} onOpen={onOpen}/>)}
    </div>
  );
}

function WholesaleRow({ p, addToCart, onOpen }: { p: Product; addToCart: (item: CartItem) => void; onOpen: (id: string) => void }) {
  const sizes = ["PP", "P", "M", "G", "GG"];
  const [qty, setQty] = useState<Record<string, number>>(Object.fromEntries(sizes.map(s => [s, 0])));
  const [colorId, setColorId] = useState(p.colors[0].id);
  const total = Object.values(qty).reduce((a, b) => a + b, 0);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "80px 2fr 1.5fr repeat(5, 60px) 80px 120px",
      padding: "16px 20px", borderBottom: "1px solid var(--brand-border)",
      alignItems: "center", fontSize: 13,
    }}>
      <button onClick={() => onOpen(p.id)} className="mono" style={{ fontSize: 11, letterSpacing: "0.08em", textAlign: "left", color: "var(--brand-muted)" }}>
        {p.id}
      </button>
      <button onClick={() => onOpen(p.id)} style={{ display: "flex", gap: 12, alignItems: "center", textAlign: "left" }}>
        <div style={{ width: 40, height: 52, background: TONE[p.colors[0].tone].bg, flexShrink: 0 }}/>
        <div>
          <div style={{ fontWeight: 500 }}>{p.name}</div>
          <div style={{ fontSize: 11, color: "var(--brand-muted)" }}>{p.collection}</div>
        </div>
      </button>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {p.colors.map(c => (
          <button key={c.id} onClick={() => setColorId(c.id)} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 8px", fontSize: 11,
            border: "1px solid " + (colorId === c.id ? "var(--brand-foreground)" : "var(--brand-border)"),
          }}>
            <span style={{ width: 10, height: 10, background: TONE[c.tone].bg, borderRadius: 999 }}/>
            {c.name}
          </button>
        ))}
      </div>
      {sizes.map(s => {
        const available = p.sizes.includes(s);
        return (
          <div key={s} style={{ display: "flex", justifyContent: "center" }}>
            <input type="number" min={0} value={available ? qty[s] : ""} disabled={!available}
              onChange={e => setQty({ ...qty, [s]: Math.max(0, parseInt(e.target.value || "0")) })}
              style={{ width: 44, height: 32, textAlign: "center", border: "1px solid var(--brand-border)", background: available ? "white" : "var(--brand-surface)", fontFamily: "var(--font-mono)", fontSize: 12 }}/>
          </div>
        );
      })}
      <div className="mono" style={{ textAlign: "right", fontWeight: 500 }}>{brl(p.price)}</div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn size="sm" variant={total >= p.moq ? "primary" : "subtle"} disabled={total < p.moq}
          onClick={() => { addToCart({ ...p, colorId, qty, total }); setQty(Object.fromEntries(sizes.map(s => [s, 0]))); }}>
          {total ? `+${total}` : `MOQ ${p.moq}`}
        </Btn>
      </div>
    </div>
  );
}

function QuickAddDrawer({ productId, onClose, addToCart }: { productId: string; onClose: () => void; addToCart: (item: CartItem) => void }) {
  const p = PRODUCTS.find(x => x.id === productId)!;
  const [colorId, setColorId] = useState(p.colors[0].id);
  const [qty, setQty] = useState<Record<string, number>>(Object.fromEntries(p.sizes.map(s => [s, 0])));
  const total = Object.values(qty).reduce((a, b) => a + b, 0);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.4)", zIndex: 100, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, background: "white", height: "100%", padding: 32, overflow: "auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="eyebrow">Grade rápida · {p.id}</div>
          <button onClick={onClose}><Icons.X/></button>
        </div>
        <Photo tone={p.colors.find(c => c.id === colorId)!.tone} ratio="4/5" product={p} caption={p.name}/>
        <div>
          <div className="display" style={{ fontSize: 32 }}>{p.name}</div>
          <div className="mono" style={{ fontSize: 14, marginTop: 4 }}>{brl(p.price)} · MOQ {p.moq}</div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Cor</div>
          <div style={{ display: "flex", gap: 8 }}>
            {p.colors.map(c => (
              <button key={c.id} onClick={() => setColorId(c.id)} style={{
                padding: "8px 12px", display: "inline-flex", gap: 8, alignItems: "center",
                border: "1px solid " + (colorId === c.id ? "var(--brand-foreground)" : "var(--brand-border)"), fontSize: 12,
              }}>
                <span style={{ width: 14, height: 14, background: TONE[c.tone].bg, borderRadius: 999 }}/>
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Grade de tamanhos</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${p.sizes.length}, 1fr)`, gap: 4 }}>
            {p.sizes.map(s => (
              <div key={s} style={{ border: "1px solid var(--brand-border)", padding: 12, textAlign: "center" }}>
                <div className="mono" style={{ fontSize: 12, color: "var(--brand-muted)", marginBottom: 8 }}>{s}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <button onClick={() => setQty({ ...qty, [s]: Math.max(0, qty[s] - 1) })}><Icons.Minus/></button>
                  <input value={qty[s]} onChange={e => setQty({ ...qty, [s]: Math.max(0, parseInt(e.target.value || "0")) })}
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
            {total < p.moq && <div style={{ fontSize: 11, color: "var(--brand-primary)", marginTop: 4 }}>+{p.moq - total} para atingir MOQ</div>}
          </div>
          <Btn variant="primary" disabled={total < p.moq}
            onClick={() => { addToCart({ ...p, colorId, qty, total }); onClose(); }}>
            Adicionar ao pedido
          </Btn>
        </div>
      </div>
    </div>
  );
}
