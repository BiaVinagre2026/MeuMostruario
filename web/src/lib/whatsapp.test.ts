import { extractWhatsappNumber, whatsappUrl } from "./whatsapp";

describe("whatsapp", () => {
  it("extrai o numero de um link wa.me", () => {
    expect(extractWhatsappNumber("https://wa.me/5521981538334")).toBe("5521981538334");
  });

  it("extrai o numero de um telefone com mascara", () => {
    expect(extractWhatsappNumber("+55 11 90000-0000")).toBe("5511900000000");
  });

  it("devolve vazio quando o tenant nao configurou o numero", () => {
    expect(extractWhatsappNumber(undefined)).toBe("");
    expect(extractWhatsappNumber(null)).toBe("");
    expect(extractWhatsappNumber("")).toBe("");
  });

  it("monta o endereco com a mensagem codificada", () => {
    expect(whatsappUrl("5521981538334", "Ola, tudo bem?")).toBe(
      "https://wa.me/5521981538334?text=Ola%2C%20tudo%20bem%3F"
    );
  });

  it("monta o endereco sem mensagem quando ela nao e passada", () => {
    expect(whatsappUrl("5521981538334")).toBe("https://wa.me/5521981538334");
  });

  it("nao monta endereco sem numero, para quem chamou poder avisar", () => {
    expect(whatsappUrl(undefined, "oi")).toBe("");
  });
});
