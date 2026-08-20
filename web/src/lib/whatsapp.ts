/**
 * Helpers de WhatsApp compartilhados.
 *
 * O numero e digitado livremente pelo admin em Configuracoes → Identidade
 * visual, entao pode chegar como link (`https://wa.me/5511...`) ou como texto
 * com mascara (`+55 11 90000-0000`). Estas funcoes aceitam os dois.
 */

/** Extrai apenas os digitos, aceitando link wa.me ou telefone com mascara. */
export function extractWhatsappNumber(raw: string | undefined | null): string {
  if (!raw) return "";
  const match = raw.match(/wa\.me\/(\d+)/);
  if (match) return match[1];
  return raw.replace(/\D/g, "");
}

/** Monta o endereco do wa.me. Devolve string vazia se nao houver numero. */
export function whatsappUrl(raw: string | undefined | null, message?: string): string {
  const number = extractWhatsappNumber(raw);
  if (!number) return "";
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${number}${text}`;
}

/**
 * Abre a conversa em nova aba. Devolve false quando o tenant ainda nao
 * configurou o numero, para quem chamou poder avisar em vez de nao fazer nada.
 */
export function openWhatsapp(raw: string | undefined | null, message?: string): boolean {
  const url = whatsappUrl(raw, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
