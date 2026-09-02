/**
 * Paleta e medidas do catalogo do comprador.
 *
 * A interface fica quase monocromatica de proposito: quem tem que ter cor na
 * tela e a peca. O acento aparece so na acao principal, no ponto ativo do
 * carrossel e no numero de pecas escolhidas.
 *
 * O acento e o unico ponto que muda por tenant, e vem por variavel CSS: o
 * produto e white-label, entao a cor que a marca escolhe nas Configuracoes
 * precisa chegar aqui. O rosa fica so como reserva, para tenant que ainda nao
 * escolheu cor nenhuma.
 */
export const ACENTO_RESERVA = "#E0356E";
export const ACENTO_SUAVE_RESERVA = "#FCE9F0";
export const ACENTO_TEXTO_RESERVA = "#FFFFFF";

/**
 * Tipografia do catalogo, tambem por tenant.
 *
 * O titulo precisa ser declarado onde e usado: uma regra global aplica
 * `font-display` a todo h1..h6, e sem sobrepor no elemento a fonte escolhida
 * pela marca nao chegaria nos titulos.
 */
export const FONTE_CORPO = "var(--cat-fonte-corpo, Inter, system-ui, sans-serif)";
export const FONTE_TITULO = 'var(--cat-fonte-titulo, "Space Grotesk", system-ui, sans-serif)';

export const t = {
  ground: "#F6F6F4",
  surface: "#FFFFFF",
  ink: "#17161B",
  inkSoft: "#4A4751",
  muted: "#83808B",
  line: "#E9E7E3",
  accent: `var(--cat-acento, ${ACENTO_RESERVA})`,
  accentSoft: `var(--cat-acento-suave, ${ACENTO_SUAVE_RESERVA})`,
  // Texto que fica em cima do acento. Nao e sempre branco: um tenant de marca
  // clara (amarelo, bege) deixaria o rotulo ilegivel.
  onAccent: `var(--cat-acento-texto, ${ACENTO_TEXTO_RESERVA})`,
  danger: "#B03A48",
} as const;

/**
 * Monta as variaveis do acento a partir da cor da marca.
 *
 * O tom suave e a cor misturada com branco, usado como fundo de destaque; o
 * texto e preto ou branco conforme a luminancia, para o rotulo continuar
 * legivel em qualquer cor que a marca escolha.
 */
export function variaveisDoAcento(corDaMarca?: string | null): React.CSSProperties {
  const rgb = hexParaRgb(corDaMarca);
  if (!rgb) return {};

  const [r, g, b] = rgb;
  const suave = `rgb(${misturaComBranco(r)}, ${misturaComBranco(g)}, ${misturaComBranco(b)})`;

  return {
    "--cat-acento": `rgb(${r}, ${g}, ${b})`,
    "--cat-acento-suave": suave,
    "--cat-acento-texto": luminancia(r, g, b) > 0.6 ? "#17161B" : "#FFFFFF",
  } as React.CSSProperties;
}

/** Aceita #RGB e #RRGGBB. Qualquer outra coisa devolve nulo e mantem a reserva. */
function hexParaRgb(valor?: string | null): [number, number, number] | null {
  const hex = valor?.trim().replace(/^#/, "") ?? "";
  const cheio = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  if (!/^[0-9a-f]{6}$/i.test(cheio)) return null;

  return [0, 2, 4].map((i) => parseInt(cheio.slice(i, i + 2), 16)) as [number, number, number];
}

/** 92% branco: fundo de destaque que nao briga com a foto. */
function misturaComBranco(canal: number): number {
  return Math.round(canal + (255 - canal) * 0.92);
}

/** Luminancia relativa (WCAG), para decidir entre texto preto e branco. */
function luminancia(r: number, g: number, b: number): number {
  const [lr, lg, lb] = [r, g, b].map((canal) => {
    const c = canal / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

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
