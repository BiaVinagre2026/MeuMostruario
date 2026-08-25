import { useRef, useState } from "react";

import { brl } from "@/data/catalog";
import type { PublicCatalogItem } from "@/types/photoCatalog";
import { TOQUE, radius, rotulo, sombra, t } from "./showcaseTheme";

export interface ModelGroup {
  chave: string;
  nome: string;
  itens: PublicCatalogItem[];
}

/**
 * Um modelo por bloco, com as fotos dele em carrossel horizontal.
 *
 * A vertical separa modelos, a horizontal percorre as fotos do mesmo modelo —
 * que e como o catalogo realmente e montado: varias fotos da mesma peca, as
 * vezes em cores diferentes. A foto seguinte fica parcialmente visivel para o
 * dedo saber que ha mais para o lado.
 */
export function ModelCarousel({ grupo, showPrices, allowOrder, qty, onQty, selected, onToggle, larguraFoto, onAbrirFoto }: {
  grupo: ModelGroup;
  showPrices: boolean;
  allowOrder: boolean;
  qty: Record<number, Record<string, number>>;
  onQty: (itemId: number, size: string, value: number) => void;
  selected: Set<number>;
  onToggle: (itemId: number) => void;
  /** 82% no celular, bem menos no desktop: a mesma peca cabe varias vezes. */
  larguraFoto: string;
  onAbrirFoto: (indice: number) => void;
}) {
  const trilhoRef = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(0);

  const itemAtivo = grupo.itens[Math.min(ativo, grupo.itens.length - 1)];
  const qtyAtivo = qty[itemAtivo?.id] ?? {};
  const pecasNoModelo = grupo.itens.reduce(
    (soma, item) => soma + Object.values(qty[item.id] ?? {}).reduce((s, v) => s + v, 0),
    0
  );

  /**
   * Descobre a foto ativa medindo os filhos, nao chutando a largura.
   *
   * A foto tem 82% do trilho mais o espacamento; qualquer porcentagem fixa
   * erra o indice depois de algumas fotos e o ponto para de acompanhar.
   */
  function aoRolar() {
    const trilho = trilhoRef.current;
    if (!trilho) return;

    const centro = trilho.scrollLeft + trilho.clientWidth / 2;
    let maisProximo = 0;
    let menorDistancia = Infinity;

    Array.from(trilho.children).forEach((filho, indice) => {
      const el = filho as HTMLElement;
      const meio = el.offsetLeft + el.offsetWidth / 2;
      const distancia = Math.abs(meio - centro);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        maisProximo = indice;
      }
    });

    setAtivo(maisProximo);
  }

  function irPara(indice: number) {
    const trilho = trilhoRef.current;
    const alvo = trilho?.children[indice] as HTMLElement | undefined;
    if (!trilho || !alvo) return;
    trilho.scrollTo({
      left: alvo.offsetLeft - (trilho.clientWidth - alvo.offsetWidth) / 2,
      behavior: "smooth",
    });
  }

  const cores = Array.from(new Set(grupo.itens.map((item) => item.color).filter(Boolean)));

  return (
    <section style={{ scrollSnapAlign: "start", padding: "8px 0 28px" }}>
      <div style={{ padding: "0 16px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 21, fontWeight: 650, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.2 }}>
            {grupo.nome}
          </h2>
          <div style={{ ...rotulo, marginTop: 5 }}>
            {grupo.itens.length} foto{grupo.itens.length > 1 ? "s" : ""}
            {cores.length > 1 ? ` · ${cores.length} cores` : cores[0] ? ` · ${cores[0]}` : ""}
          </div>
        </div>
        {pecasNoModelo > 0 && (
          <span style={{
            background: t.accent, color: "white",
            fontSize: 12, fontWeight: 700,
            padding: "5px 11px", borderRadius: radius.pilula,
            whiteSpace: "nowrap",
          }}>
            {pecasNoModelo} pç
          </span>
        )}
      </div>

      <div
        ref={trilhoRef}
        onScroll={aoRolar}
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          padding: "14px 16px 10px",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {grupo.itens.map((item, indice) => {
          const pecas = Object.values(qty[item.id] ?? {}).reduce((s, v) => s + v, 0);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onAbrirFoto(indice)}
              aria-label={`Abrir foto ${indice + 1} de ${grupo.nome}`}
              style={{
                flex: `0 0 ${larguraFoto}`,
                scrollSnapAlign: "center",
                padding: 0,
                position: "relative",
                aspectRatio: "3 / 4",
                borderRadius: radius.foto,
                overflow: "hidden",
                background: t.line,
                boxShadow: sombra.suave,
                border: "none",
                cursor: "zoom-in",
              }}
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
                />
              )}
              {pecas > 0 && (
                <span style={{
                  position: "absolute", top: 12, left: 12,
                  background: t.accent, color: "white",
                  fontSize: 12, fontWeight: 700,
                  padding: "5px 11px", borderRadius: radius.pilula,
                }}>
                  {pecas}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Ate 8 fotos os pontos sao legiveis. Acima disso viram uma fileira
          ilegivel e um contador diz mais — este catalogo tem modelo com 21. */}
      {grupo.itens.length > 1 && grupo.itens.length <= 8 && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "2px 16px 12px" }}>
          {grupo.itens.map((item, indice) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Ver foto ${indice + 1} de ${grupo.itens.length}`}
              aria-current={indice === ativo}
              onClick={() => irPara(indice)}
              style={{
                width: indice === ativo ? 22 : 7,
                height: 7,
                padding: 0,
                border: "none",
                borderRadius: radius.pilula,
                background: indice === ativo ? t.accent : t.line,
                transition: "width .2s ease, background .2s ease",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}

      {grupo.itens.length > 8 && (
        <div style={{ display: "flex", justifyContent: "center", padding: "2px 16px 12px" }}>
          <span
            aria-live="polite"
            style={{
              ...rotulo,
              color: t.inkSoft,
              background: t.surface,
              border: `1px solid ${t.line}`,
              borderRadius: radius.pilula,
              padding: "5px 12px",
              letterSpacing: "0.1em",
            }}
          >
            {ativo + 1} / {grupo.itens.length}
          </span>
        </div>
      )}

      {itemAtivo && (
        <div style={{ padding: "0 16px", display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 13, color: t.inkSoft }}>
              {[itemAtivo.color, itemAtivo.pantone].filter(Boolean).join(" · ") || "Foto " + (ativo + 1)}
            </span>
            {showPrices && (
              <strong style={{ fontSize: 19, letterSpacing: "-0.01em" }}>{brl(Number(itemAtivo.price ?? 0))}</strong>
            )}
          </div>

          {allowOrder ? (
            <div style={{ display: "grid", gap: 8 }}>
              {itemAtivo.sizes.map((size) => (
                <Stepper
                  key={size}
                  size={size}
                  valor={qtyAtivo[size] ?? 0}
                  onChange={(valor) => onQty(itemAtivo.id, size, valor)}
                />
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onToggle(itemAtivo.id)}
              aria-pressed={selected.has(itemAtivo.id)}
              style={{
                minHeight: 50,
                borderRadius: radius.pilula,
                border: selected.has(itemAtivo.id) ? "none" : `1px solid ${t.line}`,
                background: selected.has(itemAtivo.id) ? t.ink : t.surface,
                color: selected.has(itemAtivo.id) ? "white" : t.ink,
                fontSize: 15, fontWeight: 600, cursor: "pointer",
              }}
            >
              {selected.has(itemAtivo.id) ? "Na sua seleção" : "Tenho interesse"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function Stepper({ size, valor, onChange }: { size: string; valor: number; onChange: (v: number) => void }) {
  const botao: React.CSSProperties = {
    width: TOQUE, height: TOQUE,
    border: `1px solid ${t.line}`,
    background: t.surface,
    borderRadius: 12,
    fontSize: 20, lineHeight: 1,
    color: t.ink,
    cursor: "pointer",
    display: "grid", placeItems: "center",
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
      background: valor > 0 ? t.accentSoft : "transparent",
      borderRadius: 14,
      padding: valor > 0 ? "6px 8px 6px 14px" : "6px 8px 6px 14px",
      transition: "background .15s ease",
    }}>
      <span style={{ fontSize: 15, fontWeight: 500 }}>{size}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button type="button" aria-label={`Tirar uma peça do tamanho ${size}`} style={botao}
          onClick={() => onChange(Math.max(0, valor - 1))}>−</button>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          aria-label={size}
          value={valor || ""}
          placeholder="0"
          onFocus={(event) => event.target.select()}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
          style={{
            width: 54, height: TOQUE, fontSize: 16, textAlign: "center",
            border: `1px solid ${t.line}`, borderRadius: 12, background: t.surface, color: t.ink,
          }}
        />
        <button type="button" aria-label={`Somar uma peça do tamanho ${size}`} style={botao}
          onClick={() => onChange(valor + 1)}>+</button>
      </div>
    </div>
  );
}

/** Agrupa as fotos pelo modelo — e assim que o catalogo e montado. */
export function agruparPorModelo(itens: PublicCatalogItem[]): ModelGroup[] {
  const mapa = new Map<string, ModelGroup>();

  itens.forEach((item) => {
    const chave = item.name || `item-${item.id}`;
    const grupo = mapa.get(chave) ?? { chave, nome: item.name || "Sem nome", itens: [] };
    grupo.itens.push(item);
    mapa.set(chave, grupo);
  });

  return Array.from(mapa.values());
}
