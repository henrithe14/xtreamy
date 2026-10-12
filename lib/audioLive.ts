// Áudio da live (Etapa 11): efeitos sonoros por data message e utilitários de reprodução.
// Efeitos não ficam na cena: são disparos pontuais do diretor, tocados uma vez no /stage.

import { urlDeAtivo } from "@/lib/ativos";

export const TOPICO_EFEITO = "efeito";

export type PedidoEfeito = { url: string; volume: number };

export function codificarEfeito(pedido: PedidoEfeito): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify(pedido));
}

/** Lê um pedido de efeito recebido. Só arquivos do nosso bucket. */
export function lerEfeito(payload: Uint8Array): PedidoEfeito | null {
  try {
    const dado = JSON.parse(new TextDecoder().decode(payload)) as Partial<PedidoEfeito>;
    const url = urlDeAtivo(dado.url);
    if (!url || typeof dado.volume !== "number" || !Number.isFinite(dado.volume)) return null;
    return { url, volume: Math.min(1, Math.max(0, dado.volume)) };
  } catch {
    return null;
  }
}

const MAX_EFEITOS_JUNTOS = 4;
const efeitosTocando = new Set<HTMLAudioElement>();

/** Toca um efeito uma vez. Cliques em excesso são ignorados para não embolar o som. */
export function tocarEfeito({ url, volume }: PedidoEfeito) {
  if (efeitosTocando.size >= MAX_EFEITOS_JUNTOS) return;
  const audio = new Audio(url);
  audio.volume = volume;
  efeitosTocando.add(audio);
  const fim = () => efeitosTocando.delete(audio);
  audio.addEventListener("ended", fim, { once: true });
  audio.addEventListener("error", fim, { once: true });
  // Bloqueado pelo navegador: o efeito perde a hora; não tenta de novo depois.
  void audio.play().catch(fim);
}

/**
 * Toca um elemento de mídia. Numa aba comum sem clique o navegador pode bloquear;
 * aí tenta de novo no próximo clique na página (o Egress não tem esse bloqueio).
 */
export function tentarTocar(el: HTMLMediaElement) {
  void el.play().catch(() => {
    window.addEventListener("pointerdown", () => void el.play().catch(() => undefined), { once: true });
  });
}

/** Duração (s) de um áudio já enviado, para faixas antigas sem a duração registrada. */
export function lerDuracaoUrl(url: string): Promise<number | null> {
  return new Promise((resolver) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => resolver(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null);
    audio.onerror = () => resolver(null);
    audio.src = url;
  });
}
