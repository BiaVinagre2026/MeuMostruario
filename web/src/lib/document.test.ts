import { documentKind, formatDocumentInput, isValidDocument } from "./document";

describe("document", () => {
  it("aceita CPF e CNPJ validos, com e sem mascara", () => {
    expect(isValidDocument("52998224725")).toBe(true);
    expect(isValidDocument("529.982.247-25")).toBe(true);
    expect(isValidDocument("11222333000181")).toBe(true);
    expect(isValidDocument("11.222.333/0001-81")).toBe(true);
  });

  it("recusa digito verificador errado", () => {
    expect(isValidDocument("52998224724")).toBe(false);
    expect(isValidDocument("11222333000182")).toBe(false);
  });

  it("recusa sequencia repetida e tamanho invalido", () => {
    expect(isValidDocument("11111111111")).toBe(false);
    expect(isValidDocument("11111111111111")).toBe(false);
    expect(isValidDocument("123")).toBe(false);
    expect(isValidDocument("")).toBe(false);
  });

  it("aplica a mascara conforme o tamanho digitado", () => {
    expect(formatDocumentInput("529")).toBe("529");
    expect(formatDocumentInput("529982")).toBe("529.982");
    expect(formatDocumentInput("52998224725")).toBe("529.982.247-25");
    expect(formatDocumentInput("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("nao deixa passar de 14 digitos", () => {
    expect(formatDocumentInput("112223330001819999")).toBe("11.222.333/0001-81");
  });

  it("identifica o tipo do documento", () => {
    expect(documentKind("529.982.247-25")).toBe("cpf");
    expect(documentKind("11.222.333/0001-81")).toBe("cnpj");
    expect(documentKind("123")).toBeNull();
  });
});
