import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { brl } from "@/data/catalog";
import type { PublicCatalogItem } from "@/types/photoCatalog";
import { TOQUE, radius, rotulo, t } from "./showcaseTheme";
import { sizeInfo } from "@/lib/sizeGroups";

/**
 * A foto em tela cheia, com a grade junto.
 *
 * O comprador entra aqui para decidir, entao pedir precisa ser possivel sem
 * sair: fechar so para ajustar a quantidade e voltar quebra o raciocinio.
 */
export function PhotoViewer({ itens, indiceInicial, showPrices, allowOrder, qty, onQty, onFechar }: {
  itens: PublicCatalogItem[];
  indiceInicial: number;
  showPrices: boolean;
  allowOrder: boolean;
  qty: Record<number, Record<string, number>>;
  onQty: (itemId: number, size: string, value: number) => void;
  onFechar: () => void;
}) {
  const [indice, setIndice] = useState(indiceInicial);
  const item = itens[indice];
  const toqueInicial = useRef<number | null>(null);

  const anterior = () => setIndice((atual) => (atual - 1 + itens.length) % itens.length);
  const proxima = () => setIndice((atual) => (atual + 1) % itens.length);

  // Teclado no desktop: setas navegam, Esc fecha.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") onFechar();
      if (evento.key === "ArrowLeft") anterior();
      if (evento.key === "ArrowRight") proxima();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  });

  // A rolagem do fundo continuaria acontecendo atras do visor.
  useEffect(() => {
    const anteriorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = anteriorOverflow; };
  }, []);

  if (!item) return null;

  const qtyItem = qty[item.id] ?? {};
  const pecas = Object.values(qtyItem).reduce((soma, v) => soma + v, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name}, foto ${indice + 1} de ${itens.length}`}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(23,22,27,0.96)",
        display: "flex", flexDirection: "column",
      }}
      onTouchStart={(evento) => { toqueInicial.current = evento.touches[0].clientX; }}
      onTouchEnd={(evento) => {
        const inicio = toqueInicial.current;
        if (inicio === null) return;
        const distancia = evento.changedTouches[0].clientX - inicio;
        if (Math.abs(distancia) > 50) {
          if (distancia > 0) anterior();
          else proxima();
        }
        toqueInicial.current = null;
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "calc(10px + env(safe-area-inset-top)) 12px 10px",
        color: "white", flexShrink: 0,
      }}>
        <span style={{ ...rotulo, color: "rgba(255,255,255,0.72)" }}>
          {indice + 1} / {itens.length}
        </span>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar foto"
          style={{
            width: TOQUE, height: TOQUE, display: "grid", placeItems: "center",
            border: "none", background: "transparent", color: "white", cursor: "pointer",
          }}
        >
          <X size={24} />
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: "relative", display: "grid", placeItems: "center" }}>
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          />
        )}

        {itens.length > 1 && (
          <>
            <SetaVisor lado="esquerda" onClick={anterior} />
            <SetaVisor lado="direita" onClick={proxima} />
          </>
        )}
      </div>

      <div style={{
        background: t.surface,
        borderRadius: `${radius.cartao}px ${radius.cartao}px 0 0`,
        padding: `16px 16px calc(16px + env(safe-area-inset-bottom))`,
        display: "grid", gap: 12,
        maxHeight: "52dvh", overflowY: "auto",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 650, letterSpacing: "-0.02em" }}>{item.name}</div>
            <div style={{ fontSize: 13, color: t.muted, marginTop: 3 }}>
              {[item.color, item.pantone, item.size_group].filter(Boolean).join(" · ") || "Sem classificação"}
            </div>
          </div>
          {showPrices && (
            <strong style={{ fontSize: 20, whiteSpace: "nowrap" }}>{brl(Number(item.price ?? 0))}</strong>
          )}
        </div>

        {allowOrder && (
          <div style={{ display: "grid", gap: 8 }}>
            {item.sizes.map((size) => (
              <LinhaGrade
                key={size}
                size={size}
                valor={qtyItem[size] ?? 0}
                onChange={(valor) => onQty(item.id, size, valor)}
              />
            ))}
            {pecas > 0 && (
              <div style={{ fontSize: 13, color: t.inkSoft }}>
                {pecas} peça(s) desta foto no pedido
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SetaVisor({ lado, onClick }: { lado: "esquerda" | "direita"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === "esquerda" ? "Foto anterior" : "Próxima foto"}
      style={{
        position: "absolute",
        [lado === "esquerda" ? "left" : "right"]: 8,
        top: "50%", transform: "translateY(-50%)",
        width: 48, height: 48,
        display: "grid", placeItems: "center",
        borderRadius: radius.pilula,
        border: "none",
        background: "rgba(255,255,255,0.14)",
        color: "white", cursor: "pointer",
      }}
    >
      {lado === "esquerda" ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
    </button>
  );
}

function LinhaGrade({ size, valor, onChange }: { size: string; valor: number; onChange: (v: number) => void }) {
  const info = sizeInfo(size);
  const botao: React.CSSProperties = {
    width: TOQUE, height: TOQUE,
    border: `1px solid ${t.line}`, background: t.surface,
    borderRadius: 12, fontSize: 20, lineHeight: 1, color: t.ink,
    cursor: "pointer", display: "grid", placeItems: "center",
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
      background: valor > 0 ? t.accentSoft : "transparent",
      borderRadius: 14, padding: "6px 8px 6px 14px",
    }}>
      <span style={{ minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 500, display: "block" }}>{info.rotulo}</span>
        {info.numeracao && (
          <span style={{ fontSize: 12, color: t.muted }}>veste {info.numeracao}</span>
        )}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button type="button" aria-label={`Tirar uma peça do tamanho ${info.rotulo}`} style={botao}
          onClick={() => onChange(Math.max(0, valor - 1))}>−</button>
        <input
          type="number" min={0} inputMode="numeric" aria-label={info.rotulo}
          value={valor || ""} placeholder="0"
          onFocus={(evento) => evento.target.select()}
          onChange={(evento) => onChange(Math.max(0, Number(evento.target.value)))}
          style={{
            width: 54, height: TOQUE, fontSize: 16, textAlign: "center",
            border: `1px solid ${t.line}`, borderRadius: 12, background: t.surface, color: t.ink,
          }}
        />
        <button type="button" aria-label={`Somar uma peça do tamanho ${info.rotulo}`} style={botao}
          onClick={() => onChange(valor + 1)}>+</button>
      </div>
    </div>
  );
}
