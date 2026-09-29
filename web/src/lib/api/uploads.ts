import { apiClient } from "./client";

/**
 * Envia um arquivo para /admin/upload e devolve a URL publica.
 *
 * O apiClient monta o contexto do tenant e deixa o browser definir o boundary
 * do multipart. Assim uploads de marca, produto e colecao seguem exatamente a
 * mesma regra de isolamento do restante do painel.
 */
export async function uploadAsset(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const payload = await apiClient.postForm<{ url: string }>("/api/v1/admin/upload", body);
  return payload.url;
}
