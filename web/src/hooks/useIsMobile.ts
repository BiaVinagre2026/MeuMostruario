import { useEffect, useState } from "react";

/**
 * Diz se a tela e estreita o bastante para o layout de celular.
 *
 * Usa matchMedia em vez de ouvir `resize`: o evento dispara a cada pixel
 * enquanto a barra do navegador do celular aparece e some, e so interessa saber
 * quando o limiar e cruzado.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const query = `(max-width: ${breakpoint - 1}px)`;
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches);

    setIsMobile(media.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [query]);

  return isMobile;
}
