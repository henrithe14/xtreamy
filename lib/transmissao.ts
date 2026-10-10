export type StatusTransmissao = "rascunho" | "ensaio" | "ao_vivo" | "intervalo" | "encerrada";

/** Cor de tally associada a cada status (ver globals.css). */
export type Tally = "no-ar" | "ensaio" | "neutro";

export const STATUS: Record<StatusTransmissao, { rotulo: string; tally: Tally }> = {
  rascunho: { rotulo: "Rascunho", tally: "neutro" },
  ensaio: { rotulo: "Ensaio", tally: "ensaio" },
  ao_vivo: { rotulo: "Ao vivo", tally: "no-ar" },
  intervalo: { rotulo: "Intervalo", tally: "ensaio" },
  encerrada: { rotulo: "Encerrada", tally: "neutro" },
};
