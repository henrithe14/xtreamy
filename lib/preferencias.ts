// Escolhas da pré-entrada, lembradas neste navegador (só conveniência: nada aqui é segredo).

export type Resolucao = "h540" | "h720" | "h1080";

export type Preferencias = {
  nome: string;
  etiqueta: string;
  soVoz: boolean;
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

export function salvarPreferencias(preferencias: Preferencias) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(preferencias));
  } catch {
    // Modo anônimo ou armazenamento bloqueado: segue sem lembrar.
  }
}
