// Mixagem da gravação local (janela /stage?gravar=1): todo o som da live é somado por
// Web Audio e vai direto para o arquivo, sem tocar na caixa de som (evita eco no
// computador do diretor) e sem depender de "compartilhar áudio da guia".

let ctx: AudioContext | null = null;
let destino: MediaStreamAudioDestinationNode | null = null;
const elementos = new WeakSet<HTMLMediaElement>();

/** Liga a mixagem (só na janela de gravação). Idempotente. */
export function ligarMix() {
  if (ctx || typeof AudioContext === "undefined") return;
  ctx = new AudioContext();
  destino = ctx.createMediaStreamDestination();
}

export const mixLigado = () => destino !== null;

/** Precisa de um clique (política de áudio do navegador). */
export async function retomarMix() {
  if (ctx?.state === "suspended") await ctx.resume();
}

export function faixaDoMix(): MediaStreamTrack | null {
  return destino?.stream.getAudioTracks()[0] ?? null;
}

/**
 * Música, efeito, mídia ou vinheta: o som passa a ir só para a gravação. Pede CORS
 * (crossOrigin) para o navegador liberar o áudio; o bucket do Supabase permite.
 */
export function conectarElemento(el: HTMLMediaElement) {
  if (!ctx || !destino || elementos.has(el)) return;
  elementos.add(el);
  ctx.createMediaElementSource(el).connect(destino);
}

/** Voz ou áudio de tela (faixa do LiveKit) na gravação. Devolve como desconectar. */
export function conectarFaixa(faixa: MediaStreamTrack): () => void {
  if (!ctx || !destino) return () => undefined;
  const fonte = ctx.createMediaStreamSource(new MediaStream([faixa]));
  fonte.connect(destino);
  return () => fonte.disconnect();
}

/** crossOrigin só na janela de gravação (o resto continua como sempre). */
export const origemMix = (): "anonymous" | undefined => (mixLigado() ? "anonymous" : undefined);
