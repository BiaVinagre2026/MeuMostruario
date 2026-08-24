import "@testing-library/jest-dom/vitest";

// O jsdom nao implementa scrollIntoView, que todo navegador tem. Sem este
// stub, qualquer componente que traga um painel para a area visivel quebra no
// teste por um motivo que nao existe em producao.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// O jsdom tambem nao tem matchMedia. O padrao aqui e "nao casa", ou seja,
// desktop — os testes que quiserem o layout de celular sobrescrevem esta
// implementacao no proprio arquivo.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
