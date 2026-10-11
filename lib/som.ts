// Áudio local da pré-entrada: som de teste do alto-falante e destrave do áudio no iOS.

let urlBipe: string | undefined;

/** Gera (uma vez) um aviso curto de duas notas em WAV, sem arquivo externo. */
function obterUrlBipe(): string {
  if (urlBipe) return urlBipe;

  const taxa = 44100;
  const notas = [
    { freq: 660, inicio: 0, duracao: 0.18 },
    { freq: 990, inicio: 0.2, duracao: 0.32 },
  ];
  const total = Math.ceil(taxa * 0.6);
  const amostras = new Int16Array(total);

  for (const { freq, inicio, duracao } of notas) {
    const de = Math.floor(inicio * taxa);
    const n = Math.floor(duracao * taxa);
    for (let i = 0; i < n; i++) {
      const t = i / taxa;
      const envelope = Math.min(1, i / 400) * Math.exp(-4 * t); // ataque curto, decaimento suave
      amostras[de + i] += Math.round(Math.sin(2 * Math.PI * freq * t) * envelope * 0.4 * 32767);
    }
  }

  const buffer = new ArrayBuffer(44 + amostras.byteLength);
  const v = new DataView(buffer);
  const texto = (pos: number, s: string) => [...s].forEach((c, i) => v.setUint8(pos + i, c.charCodeAt(0)));
  texto(0, "RIFF");
  v.setUint32(4, 36 + amostras.byteLength, true);
  texto(8, "WAVE");
  texto(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, taxa, true);
  v.setUint32(28, taxa * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  texto(36, "data");
  v.setUint32(40, amostras.byteLength, true);
  new Int16Array(buffer, 44).set(amostras);

  urlBipe = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  return urlBipe;
}

type ElementoComSaida = HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };

/** O navegador permite escolher o alto-falante? (Safari no iPhone não permite.) */
export function suportaEscolherSaida(): boolean {
  return typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;
}

/** Toca o aviso no alto-falante escolhido. */
export async function tocarSomTeste(altoFalanteId: string): Promise<void> {
  const audio: ElementoComSaida = new Audio(obterUrlBipe());
  if (altoFalanteId && audio.setSinkId) await audio.setSinkId(altoFalanteId);
  await audio.play();
}

let contexto: AudioContext | undefined;

/**
 * No iOS/Safari o áudio só toca depois de um gesto do usuário. Chamado no clique de
 * "Entrar no Estúdio", deixa o áudio liberado para a sala (CLAUDE.md, seção 13).
 */
export async function desbloquearAudio(): Promise<void> {
  try {
    contexto ??= new AudioContext();
    if (contexto.state === "suspended") await contexto.resume();
    const silencio = contexto.createBuffer(1, 1, 22050);
    const fonte = contexto.createBufferSource();
    fonte.buffer = silencio;
    fonte.connect(contexto.destination);
    fonte.start();
  } catch {
    // Sem Web Audio: a sala tentará de novo ao conectar.
  }
}
