/**
 * Normaliza um telefone brasileiro para o formato E.164 sem o "+",
 * que é o formato usado pelo link wa.me e pela WhatsApp Cloud API.
 * Aceita "(48) 99999-8888", "48999998888", "+55 48 99999-8888" etc.
 * Retorna null se não parecer um número brasileiro válido.
 */
export function normalizarTelefoneBR(entrada: string): string | null {
  let digitos = entrada.replace(/\D/g, '');
  if (digitos.length === 12 || digitos.length === 13) {
    if (!digitos.startsWith('55')) return null;
    digitos = digitos.slice(2);
  }
  // DDD (2 dígitos, não começa com 0) + 8 dígitos (fixo) ou 9 dígitos começando com 9 (celular)
  if (!/^[1-9][1-9](\d{8}|9\d{8})$/.test(digitos)) return null;
  return `55${digitos}`;
}

/** Formata para exibição: 5548999998888 -> (48) 99999-8888 */
export function formatarTelefone(e164: string): string {
  const d = e164.startsWith('55') ? e164.slice(2) : e164;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  const corte = resto.length - 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}
