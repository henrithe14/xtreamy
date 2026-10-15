// Recado: mensagem privada de qualquer pessoa da sala para uma ou mais pessoas.
// Vai por data message com destinatários explícitos: o /stage nunca recebe, então o
// recado nunca aparece na live. Quem mandou é lido da conexão (não do texto).

export const TOPICO_RECADO = "recado";
export const LIMITE_RECADO = 500;

/** Tempo na tela de quem recebe: quanto maior o texto, mais tempo para ler (6 a 40 s). */
export function tempoNaTela(texto: string) {
  return Math.min(40_000, Math.max(6_000, 3_000 + texto.length * 70));
}

export function codificarRecado(texto: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify({ texto: texto.slice(0, LIMITE_RECADO) }));
}

export function lerRecado(payload: Uint8Array): string | null {
  try {
    const dado = JSON.parse(new TextDecoder().decode(payload)) as { texto?: unknown };
    if (typeof dado.texto !== "string") return null;
    const texto = dado.texto.trim().slice(0, LIMITE_RECADO);
    return texto || null;
  } catch {
    return null;
  }
}
