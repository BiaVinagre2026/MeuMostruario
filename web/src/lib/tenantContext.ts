// Singleton mutable para que o apiClient saiba o tenant mesmo no localhost.
// TenantProvider chama setActiveTenantSlug() ao resolver o config.

let _slug: string | undefined;

export function setActiveTenantSlug(slug: string): void {
  _slug = slug;
}

export function getActiveTenantSlug(): string | undefined {
  return _slug;
}

const RESERVED_SUBDOMAINS = ["www", "api", "admin", "app", "localhost"];

/** Endereco IP nao tem subdominio: "192.168.0.233" nao e o tenant "192". */
function isIpAddress(host: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":") || host === "[::1]";
}

/**
 * Descobre o tenant pelo subdominio do endereco (ex.: `demo.app.local` → `demo`).
 *
 * Devolve undefined quando nao ha subdominio a extrair — localhost, IP da rede
 * local ou dominio raiz. Nesses casos quem manda e o slug guardado em memoria.
 * Sem a guarda de IP, abrir pelo IP da maquina (o caminho do celular) fazia o
 * app pedir o tenant "192" e todo link de catalogo respondia 404.
 */
export function resolveTenantSlugFromHost(host: string): string | undefined {
  if (!host || isIpAddress(host)) return undefined;

  const parts = host.split(".");
  if (parts.length < 2) return undefined;

  const slug = parts[0];
  if (!slug || RESERVED_SUBDOMAINS.includes(slug)) return undefined;

  return slug;
}
