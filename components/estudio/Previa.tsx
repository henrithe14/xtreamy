"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import type { Cena } from "@/lib/cena";
import { Composicao } from "@/components/stage/Composicao";
import { StatusTally } from "@/components/ui/StatusTally";

type Props = {
  cena: Cena;
  /** Só o diretor pode abrir a saída (/stage) numa aba. */
  urlSaida?: string;
};

/** Prévia ao vivo do que vai ao ar, com as marcas de área segura. */
export function Previa({ cena, urlSaida }: Props) {
  return (
    <section aria-label="Prévia da live" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">Prévia da live</h2>
          <StatusTally status={cena.status} />
        </div>
        {urlSaida && (
          <a
            href={urlSaida}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-texto-suave hover:bg-white/[0.06] hover:text-texto"
          >
            <ArrowSquareOut weight="bold" className="size-4" aria-hidden />
            Abrir saída
          </a>
        )}
      </div>
      <div className="relative overflow-hidden rounded-xl ring-1 ring-white/10">
        <Composicao cena={cena} previa />
        <MarcasDeCanto />
      </div>
    </section>
  );
}

function MarcasDeCanto() {
  const canto = "absolute size-[5%] min-h-3 min-w-3 border-white/40";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-[2.5%]">
      <span className={`${canto} top-0 left-0 border-t-2 border-l-2`} />
      <span className={`${canto} top-0 right-0 border-t-2 border-r-2`} />
      <span className={`${canto} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${canto} right-0 bottom-0 border-r-2 border-b-2`} />
    </div>
  );
}
