// Áudio da live (Etapa 11): efeitos sonoros por data message e utilitários de reprodução.
// Efeitos não ficam na cena: são disparos pontuais do diretor, tocados uma vez no /stage.

import { urlDeAtivo } from "@/lib/ativos";
import { conectarElemento, origemMix } from "@/lib/mixGravacao";

export const TOPICO_EFEITO = "efeito";

/** "tocar" começa (ou recomeça); "parar" corta o efeito que ainda está tocando. */
export type PedidoEfeito = { url: string; volume: number; acao: "tocar" | "parar" };

export function codificarEfeito(pedido: PedidoEfeito): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify(pedido));
}

/** Lê um pedido de efeito recebido. Só arquivos do nosso bucket. */
export function lerEfeito(payload: Uint8Array): PedidoEfeito | null {
  try {
    const dado = JSON.parse(new TextDecoder().decode(payload)) as Partial<PedidoEfeito>;
    const url = urlDeAtivo(dado.url);
    if (!url || typeof dado.volume !== "number" || !Number.isFinite(dado.volume)) return null;
    return { url, volume: Math.min(1, Math.max(0, dado.volume)), acao: dado.acao === "parar" ? "parar" : "tocar" };
  } catch {
    return null;
  }
}

const MAX_EFEITOS_JUNTOS = 4;
/** Efeitos tocando agora, por URL (um de cada). */
const efeitosTocando = new Map<string, HTMLAudioElement>();
const ouvintesEfeitos = new Set<() => void>();
let versaoEfeitos = 0;
const avisar = () => {
  versaoEfeitos++;
  ouvintesEfeitos.forEach((fn) => fn());
};

export const efeitoTocando = (url: string) => efeitosTocando.has(url);
/** Para a interface acompanhar o que está tocando (useSyncExternalStore). */
export function ouvirEfeitos(fn: () => void) {
  ouvintesEfeitos.add(fn);
  return () => void ouvintesEfeitos.delete(fn);
}
export const versaoDosEfeitos = () => versaoEfeitos;

function pararEfeito(url: string) {
  const audio = efeitosTocando.get(url);
  if (!audio) return;
  audio.pause();
  efeitosTocando.delete(url);
  avisar();
}

/**
 * Toca um efeito uma vez, ou corta ("parar"). Tocar de novo o mesmo efeito recomeça.
 * Mais de 4 ao mesmo tempo são ignorados para não embolar o som.
 */
export function tocarEfeito({ url, volume, acao }: PedidoEfeito) {
  pararEfeito(url);
  if (acao === "parar" || efeitosTocando.size >= MAX_EFEITOS_JUNTOS) return;
  const audio = new Audio();
  const origem = origemMix();
  if (origem) audio.crossOrigin = origem;
  audio.src = url;
  audio.volume = volume;
  conectarElemento(audio);
  efeitosTocando.set(url, audio);
  avisar();
  const fim = () => {
    if (efeitosTocando.get(url) !== audio) return;
    efeitosTocando.delete(url);
    avisar();
  };
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
