export const PANTONE_COLORS = [
  { name: "Preto",        hex: "#1C1C1C" },
  { name: "Off-White",    hex: "#F2EDE4" },
  { name: "Bege",         hex: "#C4A882" },
  { name: "Caramelo",     hex: "#B8732A" },
  { name: "Terracota",    hex: "#C4623A" },
  { name: "Bordô",        hex: "#6B1F2E" },
  { name: "Verde Sage",   hex: "#7A9B7A" },
  { name: "Azul Marinho", hex: "#1B3055" },
] as const;

export type PantoneColor = (typeof PANTONE_COLORS)[number];

export function pantoneByHex(hex: string): PantoneColor | undefined {
  return PANTONE_COLORS.find((c) => c.hex === hex);
}
