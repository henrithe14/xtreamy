import { STATUS, type StatusTransmissao, type Tally } from "@/lib/transmissao";

const COR_PONTO: Record<Tally, string> = {
  "no-ar": "bg-no-ar tally-pulso",
  ensaio: "bg-ensaio",
  neutro: "bg-texto-suave",
};

const COR_FUNDO: Record<Tally, string> = {
  "no-ar": "bg-no-ar/15 text-no-ar",
  ensaio: "bg-ensaio/15 text-ensaio",
  neutro: "bg-white/[0.06] text-texto-suave",
};

/** Etiqueta de status de uma transmissão, com a luz de tally correspondente. */
export function StatusTally({ status }: { status: StatusTransmissao }) {
  const { rotulo, tally } = STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${COR_FUNDO[tally]}`}
    >
      <span className={`size-2 rounded-full ${COR_PONTO[tally]}`} aria-hidden />
      {rotulo}
    </span>
  );
}
