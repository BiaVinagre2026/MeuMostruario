/**
 * Copia texto informando se realmente conseguiu.
 *
 * Dois motivos para nao chamar `navigator.clipboard.writeText` direto:
 *
 * 1. A API so existe em contexto seguro. Abrindo o app pelo IP da rede local
 *    (`http://192.168.x.x`), que e como se testa no celular, `navigator.clipboard`
 *    e `undefined` e a chamada estoura.
 * 2. O Safari do iOS so autoriza a escrita dentro do gesto do usuario. Chamada
 *    depois de um `await` — como no retorno de uma requisicao — ela rejeita.
 *
 * Nos dois casos o padrao antigo (`void navigator.clipboard.writeText(...)`
 * seguido de um toast de sucesso) mentia: avisava que copiou sem ter copiado.
 * Aqui o retorno diz a verdade, para quem chamou decidir o que mostrar.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Cai no metodo antigo abaixo.
  }

  return legacyCopy(text);
}

/** Fallback para contexto inseguro: textarea fora da tela + execCommand. */
function legacyCopy(text: string): boolean {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
