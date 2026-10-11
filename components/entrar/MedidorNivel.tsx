const SEGMENTOS = 16;

/** Medidor de nível em segmentos, como um VU de mesa de som. */
export function MedidorNivel({ nivel, ativo }: { nivel: number; ativo: boolean }) {
  const acesos = Math.round(nivel * SEGMENTOS);
  return (
    <div
      role="meter"
      aria-label="Nível do microfone"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(nivel * 100)}
      className={`flex h-3 gap-0.5 ${ativo ? "" : "opacity-40"}`}
    >
      {Array.from({ length: SEGMENTOS }, (_, i) => {
        const aceso = i < acesos;
        const cor = i >= SEGMENTOS - 2 ? "bg-no-ar" : i >= SEGMENTOS - 5 ? "bg-ensaio" : "bg-pronto";
        return <span key={i} className={`flex-1 rounded-[2px] ${aceso ? cor : "bg-superficie-2"}`} />;
      })}
    </div>
  );
}
