// Portão de ruído do microfone (como no Discord): com o microfone aberto e a pessoa calada,
// nada é transmitido. Roda num AudioWorklet (thread de áudio), então não para quando a aba
// fica em segundo plano. Entra como processador da faixa do LiveKit.

import type { AudioProcessorOptions, Track, TrackProcessor } from "livekit-client";

/** Abaixo disto (dBFS, média do bloco) o portão fecha. Voz normal fica entre -35 e -15. */
const LIMIAR_DB = -50;
/** Quanto tempo o portão fica aberto depois da última fala (evita cortar fins de palavra). */
const SEGURAR_S = 0.4;

// Código do worklet (módulo carregado por Blob; não precisa de arquivo público).
const CODIGO_WORKLET = `
class PortaoRuido extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ganho = 0;
    this.segura = 0;
    this.abrir = Math.pow(10, ${LIMIAR_DB} / 20);
    this.fechar = Math.pow(10, ${LIMIAR_DB - 6} / 20); // histerese: fecha 6 dB abaixo
  }
  process(entradas, saidas) {
    const entrada = entradas[0];
    const saida = saidas[0];
    if (!entrada || entrada.length === 0 || !saida) return true;
    let soma = 0;
    let n = 0;
    for (const canal of entrada) {
      for (let i = 0; i < canal.length; i++) soma += canal[i] * canal[i];
      n += canal.length;
    }
    const rms = Math.sqrt(soma / Math.max(1, n));
    const bloco = entrada[0].length / sampleRate;
    const aberto = this.segura > 0;
    if (rms >= this.abrir || (aberto && rms >= this.fechar)) this.segura = ${SEGURAR_S};
    else this.segura = Math.max(0, this.segura - bloco);
    const alvo = this.segura > 0 ? 1 : 0;
    // Abre em ~5 ms (não come o começo da fala) e fecha em ~120 ms (sem estalo).
    const tempo = alvo > this.ganho ? 0.005 : 0.12;
    const coef = 1 - Math.exp(-1 / (tempo * sampleRate));
    for (let c = 0; c < saida.length; c++) {
      const dentro = entrada[Math.min(c, entrada.length - 1)];
      const fora = saida[c];
      let g = this.ganho;
      for (let i = 0; i < fora.length; i++) {
        g += (alvo - g) * coef;
        fora[i] = dentro[i] * g;
      }
      if (c === saida.length - 1) this.ganho = g;
    }
    return true;
  }
}
registerProcessor("portao-ruido", PortaoRuido);
`;

const modulosCarregados = new WeakMap<AudioContext, Promise<void>>();

function carregarModulo(contexto: AudioContext) {
  let pronto = modulosCarregados.get(contexto);
  if (!pronto) {
    const url = URL.createObjectURL(new Blob([CODIGO_WORKLET], { type: "text/javascript" }));
    pronto = contexto.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
    modulosCarregados.set(contexto, pronto);
  }
  return pronto;
}

/** O navegador tem o que o portão precisa? (Senão o microfone segue sem ele.) */
export const portaoSuportado = () => typeof AudioWorkletNode !== "undefined";

export function criarPortaoRuido(): TrackProcessor<Track.Kind.Audio, AudioProcessorOptions> {
  let fonte: MediaStreamAudioSourceNode | undefined;
  let no: AudioWorkletNode | undefined;
  let destino: MediaStreamAudioDestinationNode | undefined;

  const processador: TrackProcessor<Track.Kind.Audio, AudioProcessorOptions> = {
    name: "portao-ruido",
    async init({ track, audioContext }) {
      await carregarModulo(audioContext);
      fonte = audioContext.createMediaStreamSource(new MediaStream([track]));
      no = new AudioWorkletNode(audioContext, "portao-ruido", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
      destino = audioContext.createMediaStreamDestination();
      fonte.connect(no).connect(destino);
      processador.processedTrack = destino.stream.getAudioTracks()[0];
    },
    async restart(opcoes) {
      await processador.destroy();
      await processador.init(opcoes);
    },
    async destroy() {
      fonte?.disconnect();
      no?.disconnect();
      no?.port.close();
      processador.processedTrack?.stop();
      fonte = no = destino = undefined;
      processador.processedTrack = undefined;
    },
  };
  return processador;
}
