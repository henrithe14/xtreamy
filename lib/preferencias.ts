// Escolhas da pré-entrada, lembradas neste navegador (só conveniência: nada aqui é segredo).

import type { ModoHost } from "@/lib/participante";

export type Resolucao = "h540" | "h720" | "h1080";

export type Preferencias = {
  nome: string;
  etiqueta: string;
  soVoz: boolean;
  /** Só vale para o dono da transmissão. */
  modoHost: ModoHost;
  cameraId: string;
  microfoneId: string;
  altoFalanteId: string;
  resolucao: Resolucao;
  cancelamentoEco: boolean;
  reducaoRuido: boolean;
};

export const PREFERENCIAS_PADRAO: Preferencias = {
  nome: "",
  etiqueta: "",
  soVoz: false,
  modoHost: "apresentador",
  cameraId: "",
  microfoneId: "",
  altoFalanteId: "",
  resolucao: "h720",
  cancelamentoEco: true,
  reducaoRuido: true,
};

export const LIMITES_IDENTIDADE = { nome: 40, etiqueta: 40 } as const;

const CHAVE = "estudio:preferencias";

export function carregarPreferencias(): Preferencias {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return PREFERENCIAS_PADRAO;
    const salvo = JSON.parse(bruto) as Partial<Preferencias>;
    return { ...PREFERENCIAS_PADRAO, ...salvo };
  } catch {
    return PREFERENCIAS_PADRAO;
  }
}

/** Sem câmera: escolheu "só voz" ou é o diretor que só controla. */
export function semCamera(p: Preferencias, papel: "host" | "convidado"): boolean {
  return p.soVoz || (papel === "host" && p.modoHost === "diretor");
}

export function salvarPreferencias(preferencias: Preferencias) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(preferencias));
  } catch {
    // Modo anônimo ou armazenamento bloqueado: segue sem lembrar.
  }
}
