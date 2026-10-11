type Props = {
  /** Quando true, o ponto central vira luz de tally vermelha ("no ar") e pulsa. */
  aoVivo?: boolean;
  /** Mostra o nome ao lado do símbolo. */
  comNome?: boolean;
  className?: string;
};

/**
 * Símbolo Xtreamy: quadro 16:9 com marcas de área segura e um ponto central que
 * funciona como luz de tally — azul→verde em repouso, vermelho quando está no ar.
 */
export function Marca({ aoVivo = false, comNome = true, className = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <SimboloMarca aoVivo={aoVivo} className="size-8" />
      {comNome && <span className="fonte-larga text-lg font-bold tracking-tight">Xtreamy</span>}
    </span>
  );
}

export function SimboloMarca({ aoVivo = false, className = "" }: Omit<Props, "comNome">) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label={aoVivo ? "Xtreamy, no ar" : "Xtreamy"}>
      <defs>
        {/* Mesmo id em todas as instâncias: definições idênticas, sem conflito. */}
        <linearGradient id="xtreamy-tally" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <path
        d="M3 13V9.5A2.5 2.5 0 0 1 5.5 7H9M23 7h3.5A2.5 2.5 0 0 1 29 9.5V13M29 19v3.5a2.5 2.5 0 0 1-2.5 2.5H23M9 25H5.5A2.5 2.5 0 0 1 3 22.5V19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      <circle
        cx="16"
        cy="16"
        r="5"
        className={aoVivo ? "tally-pulso fill-no-ar" : undefined}
        fill={aoVivo ? undefined : "url(#xtreamy-tally)"}
      />
    </svg>
  );
}
