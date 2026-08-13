/**
 * Validacao de CPF e CNPJ no cliente.
 *
 * Espelha o DocumentValidator do backend de proposito: a validacao do servidor
 * continua sendo a que vale, mas repetir o calculo aqui evita mandar o comprador
 * ate o gateway para descobrir que digitou um digito errado.
 */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function documentKind(value: string): "cpf" | "cnpj" | null {
  const digits = onlyDigits(value);
  if (digits.length === 11) return "cpf";
  if (digits.length === 14) return "cnpj";
  return null;
}

export function isValidDocument(value: string): boolean {
  const digits = onlyDigits(value);
  if (new Set(digits).size === 1) return false;

  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}

/** Aplica a mascara conforme o comprador digita, alternando CPF e CNPJ pelo tamanho. */
export function formatDocumentInput(value: string): string {
  const d = onlyDigits(value).slice(0, 14);

  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function isValidCpf(cpf: string): boolean {
  return cpfCheckDigit(cpf, 9) === Number(cpf[9]) && cpfCheckDigit(cpf, 10) === Number(cpf[10]);
}

function cpfCheckDigit(cpf: string, position: number): number {
  let sum = 0;
  for (let i = 0; i < position; i += 1) {
    sum += Number(cpf[i]) * (position + 1 - i);
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

const CNPJ_FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_SECOND_WEIGHTS = [6, ...CNPJ_FIRST_WEIGHTS];

function isValidCnpj(cnpj: string): boolean {
  return (
    cnpjCheckDigit(cnpj, CNPJ_FIRST_WEIGHTS) === Number(cnpj[12]) &&
    cnpjCheckDigit(cnpj, CNPJ_SECOND_WEIGHTS) === Number(cnpj[13])
  );
}

function cnpjCheckDigit(cnpj: string, weights: number[]): number {
  const sum = weights.reduce((acc, weight, index) => acc + Number(cnpj[index]) * weight, 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}
