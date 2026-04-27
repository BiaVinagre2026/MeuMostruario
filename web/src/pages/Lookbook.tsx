import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Photo, Btn } from "@/components/showroom/primitives";
import { LOOKBOOK, PRODUCTS } from "@/data/catalog";

export default function Lookbook() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const book = LOOKBOOK[active];

  return (
    <main>
      <section style={{ padding: "48px 32px 0" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Editorial · 3 histórias</div>
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
                  style={{ gridColumn: spanTwo ? "span 2" : "auto", aspectRatio: spanTwo ? "3/2" : "3/4" }}/>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
