import { useOperatorStore } from "@/stores/useOperatorStore";

const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? "";

/**
 * Envia um arquivo para /admin/upload e devolve a URL publica.
 *
 * Diferente do apiClient, aqui o Content-Type fica por conta do browser: ele
 * precisa montar o boundary do multipart. O X-Admin-Tenant-Slug continua sendo
 * enviado para que o super-admin operando dentro de outro tenant grave o
 * arquivo no tenant certo.
 */
export async function uploadAsset(file: File): Promise<string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const slug = useOperatorStore.getState().activeTenantSlug;
  if (slug) headers["X-Admin-Tenant-Slug"] = slug;

  const body = new FormData();
  body.append("file", file);

  const response = await fetch(`${BASE_URL}/api/v1/admin/upload`, {
    method: "POST",
    credentials: "include",
    headers,
    body,
  });

  const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

  if (!response.ok || !payload.url) {
    throw new Error(payload.error || "Nao foi possivel enviar o arquivo.");
  }

  return payload.url;
}
