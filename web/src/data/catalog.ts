import type { Tenant, Collection, Category, Product, Tier, LookbookStory, ToneEntry } from "@/types/catalog";

export const TENANT: Tenant = {
  id: "meumostruario",
  name: "Meu Mostruário",
  tagline: "Atelier de moda praia e movimento",
  handle: "@meumostruario",
  location: "São Paulo, BR",
  whatsapp: "+55 11 90000-0000",
  minOrder: { units: 12, amount: 1500 },
  currency: "BRL",
  cnpj: "00.000.000/0001-00",
};

export const COLLECTIONS: Collection[] = [
  { id: "solar",     name: "Solar",     season: "Verão 26",       pieces: 34, status: "DROP ATIVO" },
  { id: "movimento", name: "Movimento", season: "Perene",          pieces: 18, status: "REPOSIÇÃO" },
  { id: "off-hours", name: "Off Hours", season: "Resort 26",       pieces: 22, status: "PRÉ-VENDA" },
  { id: "archive",   name: "Archive",   season: "Últimas peças",   pieces: 41, status: "OUTLET" },
];

export const CATEGORIES: Category[] = [
  { id: "all",        label: "Tudo",        count: 115 },
  { id: "biquini",    label: "Biquínis",    count: 38 },
  { id: "praia",      label: "Moda praia",  count: 24 },
  { id: "fitness",    label: "Fitness",     count: 29 },
  { id: "roupas",     label: "Roupas",      count: 18 },
  { id: "acessorios", label: "Acessórios",  count: 6 },
];

export const TONE: Record<string, ToneEntry> = {
  sand:  { bg: "#E8DDCE", fg: "#5C4A33" },
  ochre: { bg: "#C9A279", fg: "#3E2A18" },
  clay:  { bg: "#B87E5C", fg: "#2E1A10" },
  terra: { bg: "#8B5E3C", fg: "#1C0F07" },
  cream: { bg: "#F2EBDF", fg: "#6E5D46" },
  noir:  { bg: "#1A1A1A", fg: "#F0EDE8" },
  olive: { bg: "#8A8A5E", fg: "#1E1E10" },
  bone:  { bg: "#E5DECF", fg: "#4A3E28" },
  coral: { bg: "#FF5A3C", fg: "#FFFFFF" },
  shell: { bg: "#F5E8DB", fg: "#6E4A2E" },
};

export const PRODUCTS: Product[] = [
  {
    id: "SOL-001", name: "Biquíni Marés", collection: "solar", category: "biquini",
    price: 89.0, priceRetail: 189.0,
    colors: [{ id: "sand", name: "Areia", tone: "sand" }, { id: "noir", name: "Preto", tone: "noir" }, { id: "coral", name: "Coral", tone: "coral" }],
    sizes: ["PP", "P", "M", "G", "GG"],
    tags: ["Top cortininha", "Calcinha asa delta", "Proteção UV"],
    description: "Top cortininha com bojo removível e calcinha asa delta de cintura baixa. Tecido canelado com toque suave e proteção UV50+.",
    fabric: "82% Poliamida / 18% Elastano", madeIn: "São Paulo, BR",
    moq: 6, stockBySize: { PP: 42, P: 120, M: 160, G: 80, GG: 24 }, featured: true,
  },
  {
    id: "SOL-002", name: "Biquíni Horizonte", collection: "solar", category: "biquini",
    price: 94.0, priceRetail: 199.0,
    colors: [{ id: "clay", name: "Argila", tone: "clay" }, { id: "olive", name: "Oliva", tone: "olive" }, { id: "bone", name: "Osso", tone: "bone" }],
    sizes: ["PP", "P", "M", "G", "GG"],
    tags: ["Top triângulo", "Hot pants"],
    description: "Top triângulo com alças reguláveis e hot pants de cintura alta. Modelagem que alonga a silhueta.",
    fabric: "80% Poliamida / 20% Elastano", madeIn: "São Paulo, BR", moq: 6,
  },
  {
    id: "SOL-003", name: "Biquíni Duna", collection: "solar", category: "biquini",
    price: 92.0, priceRetail: 189.0,
    colors: [{ id: "ochre", name: "Ocre", tone: "ochre" }, { id: "shell", name: "Concha", tone: "shell" }],
    sizes: ["P", "M", "G"], tags: ["Top faixa", "Brasileirinha"], moq: 6,
  },
  {
    id: "SOL-004", name: "Maiô Solstício", collection: "solar", category: "praia",
    price: 148.0, priceRetail: 289.0,
    colors: [{ id: "noir", name: "Preto", tone: "noir" }, { id: "terra", name: "Terra", tone: "terra" }],
    sizes: ["P", "M", "G", "GG"], tags: ["Decote profundo", "Cavada alta"], moq: 4,
  },
  {
    id: "MOV-011", name: "Top Cardio", collection: "movimento", category: "fitness",
    price: 78.0, priceRetail: 159.0,
    colors: [{ id: "noir", name: "Preto", tone: "noir" }, { id: "olive", name: "Oliva", tone: "olive" }, { id: "cream", name: "Creme", tone: "cream" }],
    sizes: ["PP", "P", "M", "G", "GG"], tags: ["Alto impacto", "Alças cruzadas"], moq: 6,
  },
  {
    id: "MOV-012", name: "Legging Corrida", collection: "movimento", category: "fitness",
    price: 124.0, priceRetail: 249.0,
    colors: [{ id: "noir", name: "Preto", tone: "noir" }, { id: "clay", name: "Argila", tone: "clay" }],
    sizes: ["PP", "P", "M", "G", "GG"], tags: ["Cintura alta", "Tecido compressivo"],
    moq: 6, featured: true,
  },
  {
    id: "MOV-013", name: "Short Ciclismo", collection: "movimento", category: "fitness",
    price: 86.0, priceRetail: 169.0,
    colors: [{ id: "noir", name: "Preto", tone: "noir" }, { id: "olive", name: "Oliva", tone: "olive" }],
    sizes: ["P", "M", "G"], moq: 6,
  },
  {
    id: "OFF-021", name: "Saída Brisa", collection: "off-hours", category: "praia",
    price: 168.0, priceRetail: 329.0,
    colors: [{ id: "cream", name: "Creme", tone: "cream" }, { id: "sand", name: "Areia", tone: "sand" }],
    sizes: ["Único"], tags: ["Crochê", "Manga longa"], moq: 4, featured: true,
  },
  {
    id: "OFF-022", name: "Vestido Pôr-do-Sol", collection: "off-hours", category: "roupas",
    price: 194.0, priceRetail: 389.0,
    colors: [{ id: "terra", name: "Terra", tone: "terra" }, { id: "noir", name: "Preto", tone: "noir" }],
    sizes: ["P", "M", "G"], moq: 4,
  },
  {
    id: "OFF-023", name: "Calça Pareô", collection: "off-hours", category: "roupas",
    price: 136.0, priceRetail: 269.0,
    colors: [{ id: "sand", name: "Areia", tone: "sand" }, { id: "clay", name: "Argila", tone: "clay" }],
    sizes: ["P", "M", "G"], moq: 6,
  },
  {
    id: "ACC-031", name: "Chapéu Palha", collection: "solar", category: "acessorios",
    price: 58.0, priceRetail: 119.0,
    colors: [{ id: "cream", name: "Natural", tone: "cream" }],
    sizes: ["Único"], moq: 6,
  },
  {
    id: "ACC-032", name: "Canga Editorial", collection: "solar", category: "acessorios",
    price: 72.0, priceRetail: 139.0,
    colors: [{ id: "shell", name: "Concha", tone: "shell" }, { id: "ochre", name: "Ocre", tone: "ochre" }],
    sizes: ["Único"], moq: 6,
  },
];

export const TIERS: Tier[] = [
  { min: 1,   max: 11,   discount: 0,  label: "Preço atacado" },
  { min: 12,  max: 35,   discount: 5,  label: "Multimarca" },
  { min: 36,  max: 99,   discount: 10, label: "Revenda" },
  { min: 100, max: null, discount: 15, label: "Volume" },
];

export const LOOKBOOK: LookbookStory[] = [
  { id: 1, title: "Solar",     subtitle: "O sol como co-autor",       shots: 8,  season: "Verão 26", tone: "sand" },
  { id: 2, title: "Movimento", subtitle: "Corpo em deslocamento",      shots: 6,  season: "Perene",   tone: "noir" },
  { id: 3, title: "Off Hours", subtitle: "Entre o banho e o jantar",   shots: 10, season: "Resort 26", tone: "clay" },
];

export function brl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function activeTier(units: number): Tier {
  return TIERS.filter(t => units >= t.min && (!t.max || units <= t.max))[0] ?? TIERS[0];
}
