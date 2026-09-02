import { useEffect } from "react";

import { updateFavicon, type FaviconMode } from "@/lib/favicon";
import { ACENTO_RESERVA } from "./showcaseTheme";

/** Só o que a identidade da aba precisa; o resto da marca não interessa aqui. */
export interface MarcaDaAba {
  tenant_name?: string | null;
  company_name?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  favicon_mode?: string | null;
  color_primary?: string | null;
}

/**
 * Põe a loja na aba do navegador enquanto o catálogo está aberto.
 *
 * O produto é white-label e o link é aberto de qualquer lugar — WhatsApp, IP
 * da rede, domínio próprio. Sem isso o comprador do tenant lia "Meu
 * Mostruário" na aba e via um ícone genérico: o nome da plataforma vazando
 * para o cliente do cliente.
 *
 * A identidade vem do próprio link, e não do TenantProvider, porque aquele
 * resolve o tenant pelo endereço — o que só funciona com domínio por tenant.
 *
 * Título e ícone são globais, então são devolvidos ao sair: sem isso a aba
 * continuaria com a marca da loja depois de voltar para o admin.
 */
export function useIdentidadeDaLoja(marca: MarcaDaAba | null | undefined, nomeDoCatalogo?: string) {
  const loja = marca?.company_name?.trim() || marca?.tenant_name?.trim() || "";
  const favicon = marca?.favicon_url || marca?.logo_url || "";
  const modo = (marca?.favicon_mode as FaviconMode) || (favicon ? "upload" : "auto");
  const cor = marca?.color_primary || ACENTO_RESERVA;

  useEffect(() => {
    if (!loja) return;

    const tituloAnterior = document.title;
    const iconeAnterior = document.querySelector<HTMLLinkElement>("#dynamic-favicon")?.href ?? null;

    document.title = nomeDoCatalogo ? `${loja} · ${nomeDoCatalogo}` : loja;
    updateFavicon({
      mode: modo,
      faviconUrl: favicon || null,
      name: loja,
      primaryColor: cor,
      secondaryColor: "#FFFFFF",
    });

    return () => {
      document.title = tituloAnterior;
      const link = document.querySelector<HTMLLinkElement>("#dynamic-favicon");
      // Só devolve se havia ícone antes; apagar o href deixaria a aba sem
      // nenhum, que é pior do que o ícone da loja anterior.
      if (link && iconeAnterior) link.href = iconeAnterior;
    };
  }, [loja, nomeDoCatalogo, favicon, modo, cor]);
}

/**
 * Fontes da marca como variáveis CSS.
 *
 * Elas já eram editáveis no admin e só valiam na prévia da própria tela de
 * configuração — o catálogo do comprador ficava sempre em Inter e Space
 * Grotesk. Sem fonte escolhida, continua nesses dois.
 */
export function variaveisDaTipografia(marca?: { font_primary?: string | null; font_heading?: string | null } | null): React.CSSProperties {
  const vars: Record<string, string> = {};
  const corpo = marca?.font_primary?.trim();
  const titulo = marca?.font_heading?.trim();

  // Aspas porque nome de fonte com espaco ("Space Grotesk") quebra sem elas.
  if (corpo) vars["--cat-fonte-corpo"] = `"${corpo}", system-ui, sans-serif`;
  if (titulo) vars["--cat-fonte-titulo"] = `"${titulo}", system-ui, sans-serif`;

  return vars as React.CSSProperties;
}
