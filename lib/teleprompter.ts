// Teleprompter (Etapa 13): o diretor envia um texto que rola só na tela de quem recebe.
// Vai por data message com destinatários explícitos: o /stage nunca recebe, então o
// texto nunca aparece na live.

export const TOPICO_TELEPROMPTER = "teleprompter";
export const LIMITE_ROTEIRO = { titulo: 80, texto: 20000 } as const;
export const VELOCIDADE = { min: 1, max: 10, padrao: 3 } as const;
export const TAMANHO = { min: 20, max: 72, padrao: 36 } as const;

/** Linhas (em `em`) por segundo em cada nível de velocidade. */
export const emPorSegundo = (velocidade: number) => velocidade * 0.18;

export type EstadoTeleprompter = {
  titulo: string;
  texto: string;
  rodando: boolean;
  velocidade: number;
  tamanho: number;
  /** Posição da rolagem (em `em`) no instante `em`. */
  posicao: number;
  em: number;
};

export type MensagemTeleprompter = { estado: EstadoTeleprompter | null };

/** Posição agora, contando o tempo rolando desde a última mudança. */
export function posicaoAgora(e: EstadoTeleprompter, agora: number) {
  return e.rodando ? e.posicao + ((agora - e.em) / 1000) * emPorSegundo(e.velocidade) : e.posicao;
}

const limitar = (v: unknown, min: number, max: number, padrao: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : padrao;

export function lerMensagemTeleprompter(payload: Uint8Array): MensagemTeleprompter | null {
  try {
    const dado = JSON.parse(new TextDecoder().decode(payload)) as { estado?: Partial<EstadoTeleprompter> | null };
    if (dado.estado === null) return { estado: null };
    const e = dado.estado;
    if (!e || typeof e.texto !== "string" || typeof e.titulo !== "string") return null;
    return {
      estado: {
        titulo: e.titulo.slice(0, LIMITE_ROTEIRO.titulo),
        texto: e.texto.slice(0, LIMITE_ROTEIRO.texto),
        rodando: e.rodando === true,
        velocidade: limitar(e.velocidade, VELOCIDADE.min, VELOCIDADE.max, VELOCIDADE.padrao),
        tamanho: limitar(e.tamanho, TAMANHO.min, TAMANHO.max, TAMANHO.padrao),
        posicao: limitar(e.posicao, 0, 1e6, 0),
        em: limitar(e.em, 0, 1e15, Date.now()),
      },
    };
  } catch {
    return null;
  }
}

export function codificarTeleprompter(m: MensagemTeleprompter): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify(m));
}

// Canal local: o próprio diretor pode estar entre os destinatários (data message não
// volta para quem envia).
type Ouvinte = (m: MensagemTeleprompter) => void;
const ouvintes = new Set<Ouvinte>();
export function ouvirLocal(fn: Ouvinte) {
  ouvintes.add(fn);
  return () => void ouvintes.delete(fn);
}
export function emitirLocal(m: MensagemTeleprompter) {
  ouvintes.forEach((fn) => fn(m));
}
