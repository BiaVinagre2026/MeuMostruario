/**
 * Paleta e medidas do catalogo do comprador.
 *
 * A interface fica quase monocromatica de proposito: quem tem que ter cor na
 * tela e a peca. O acento aparece so na acao principal, no ponto ativo do
 * carrossel e no numero de pecas escolhidas.
 */
export const t = {
  ground: "#F6F6F4",
  surface: "#FFFFFF",
  ink: "#17161B",
  inkSoft: "#4A4751",
  muted: "#83808B",
  line: "#E9E7E3",
  accent: "#E0356E",
  accentSoft: "#FCE9F0",
  danger: "#B03A48",
} as const;

export const radius = {
  foto: 18,
  cartao: 20,
  pilula: 999,
} as const;

/** Alvo minimo de toque. Abaixo disso o dedo erra. */
export const TOQUE = 44;

export const sombra = {
  suave: "0 1px 2px rgba(23,22,27,0.04), 0 8px 24px rgba(23,22,27,0.06)",
  flutuante: "0 8px 30px rgba(23,22,27,0.18)",
} as const;

export const rotulo: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: t.muted,
  fontWeight: 600,
};
