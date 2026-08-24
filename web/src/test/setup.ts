import "@testing-library/jest-dom/vitest";

// O jsdom nao implementa scrollIntoView, que todo navegador tem. Sem este
// stub, qualquer componente que traga um painel para a area visivel quebra no
// teste por um motivo que nao existe em producao.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
