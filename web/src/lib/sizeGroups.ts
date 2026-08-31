import { SIZE_GROUPS, type SizeGroup } from "@/types/photoCatalog";

/**
 * Como cada faixa de tamanho e apresentada para quem compra.
 *
 * O valor guardado no banco continua sendo o de SIZE_GROUPS — renomear
 * quebraria as fotos ja classificadas. Aqui mora so a apresentacao: o nome que
 * a loja usa no dia a dia e a numeracao correspondente, que a lojista precisa
 * para decidir e que ate agora nao aparecia em lugar nenhum.
 */
export interface SizeGroupInfo {
  /** Valor persistido. Nao mudar sem migrar os dados. */
  valor: SizeGroup;
  /** Nome usado pela loja. */
  rotulo: string;
  /** Numeracao que a faixa veste. */
  numeracao: string;
  /** Quando a faixa se aplica, quando isso nao e obvio. */
  observacao?: string;
}

export const SIZE_GROUP_INFO: Record<SizeGroup, SizeGroupInfo> = {
  "P/M": {
    valor: "P/M",
    rotulo: "P/M",
    numeracao: "36 ao 40",
    observacao: "Leggings e bermudas",
  },
  "M/G": {
    valor: "M/G",
    rotulo: "M/G",
    numeracao: "42 ao 46",
    observacao: "Leggings e bermudas",
  },
  Unico: {
    valor: "Unico",
    rotulo: "Único",
    numeracao: "36 ao 42",
    observacao: "Macaquinhos, macacões e shorts",
  },
  "Plus 1": {
    valor: "Plus 1",
    rotulo: "T1 Plus",
    numeracao: "46/48",
  },
  "Plus 2": {
    valor: "Plus 2",
    rotulo: "T2 Plus",
    numeracao: "50/54",
  },
};

export const SIZE_GROUP_OPTIONS: SizeGroupInfo[] = SIZE_GROUPS.map((valor) => SIZE_GROUP_INFO[valor]);

/** Faixas desconhecidas aparecem como vieram, em vez de sumirem da tela. */
export function sizeInfo(valor: string): SizeGroupInfo {
  return SIZE_GROUP_INFO[valor as SizeGroup] ?? { valor: valor as SizeGroup, rotulo: valor, numeracao: "" };
}

export function sizeLabel(valor: string): string {
  return sizeInfo(valor).rotulo;
}

/** "T1 Plus (46/48)" — para menus e listas onde cabe a linha inteira. */
export function sizeLabelComNumeracao(valor: string): string {
  const info = sizeInfo(valor);
  return info.numeracao ? `${info.rotulo} (${info.numeracao})` : info.rotulo;
}
