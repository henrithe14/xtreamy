"use client";

import { useEffect, useState } from "react";
import { ArrowSquareOut, ArrowsIn, ArrowsOut, Headphones } from "@phosphor-icons/react";
import type { Cena } from "@/lib/cena";
import { Composicao } from "@/components/stage/Composicao";
import { StatusTally } from "@/components/ui/StatusTally";

type Props = {
  cena: Cena;
  /** Só o diretor pode abrir a saída (/stage) numa aba. */
  urlSaida?: string;
  aoTerminarVinheta?: () => void;
  /** Só o diretor: ouvir a mixagem da live no lugar do som da sala. */
  ouvindo?: boolean;
  aoAlternarOuvir?: () => void;
};

const CHAVE_TAMANHO = "estudio:previa-compacta";

/**
 * Prévia ao vivo do que vai ao ar, com as marcas de área segura. A altura é limitada
 * (normal ou compacta, lembrada no navegador) para sobrar espaço para as pessoas.
 */
export function Previa({ cena, urlSaida, aoTerminarVinheta, ouvindo = false, aoAlternarOuvir }: Props) {
  const [compacta, setCompacta] = useState(false);

  useEffect(() => {
    try {
      // Preferência lida só no cliente, uma vez.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompacta(localStorage.getItem(CHAVE_TAMANHO) === "1");
    } catch {}
  }, []);

  function alternar() {
    setCompacta((atual) => {
      try {
        localStorage.setItem(CHAVE_TAMANHO, atual ? "0" : "1");
      } catch {}
      return !atual;
    });
  }

  return (
    <section
      aria-label="Prévia da live"
      // --altura: altura máxima da prévia; a largura sai dela (16:9), sem passar da coluna.
      className={`flex w-[min(100%,calc(var(--altura)*16/9))] flex-col gap-2 deitado:[--altura:calc(100dvh-8.5rem)] ${
        compacta ? "[--altura:36dvh]" : "[--altura:62dvh]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold deitado:sr-only">Prévia da live</h2>
          <StatusTally status={cena.status} />
        </div>
        <div className="flex items-center gap-1">
          {aoAlternarOuvir && (
            <button
              type="button"
              onClick={aoAlternarOuvir}
              aria-pressed={ouvindo}
              title="Ouve só o que vai ao ar (use fones). A equipe no bastidor fica muda para você enquanto estiver ligado."
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm ${
                ouvindo ? "bg-destaque/20 text-texto ring-1 ring-destaque" : "text-texto-suave hover:bg-white/[0.06] hover:text-texto"
              }`}
            >
              <Headphones weight="bold" className="size-4" aria-hidden />
              <span className="deitado:sr-only">{ouvindo ? "Ouvindo a live" : "Ouvir a live"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={alternar}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-texto-suave hover:bg-white/[0.06] hover:text-texto deitado:hidden"
          >
            {compacta ? <ArrowsOut weight="bold" className="size-4" aria-hidden /> : <ArrowsIn weight="bold" className="size-4" aria-hidden />}
            {compacta ? "Prévia maior" : "Prévia menor"}
          </button>
          {urlSaida && (
            <a
              href={urlSaida}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-texto-suave hover:bg-white/[0.06] hover:text-texto"
            >
              <ArrowSquareOut weight="bold" className="size-4" aria-hidden />
              <span className="deitado:sr-only">Abrir saída</span>
            </a>
          )}
        </div>
      </div>
      <div className="relative overflow-hidden rounded-xl ring-1 ring-white/10">
        <Composicao cena={cena} previa comSom={ouvindo} aoTerminarVinheta={aoTerminarVinheta} />
        <MarcasDeCanto />
      </div>
      {ouvindo && (
        <p role="status" className="text-xs text-texto-suave">
          Você está ouvindo só a live. Quem está no bastidor fica mudo para você até desligar.
        </p>
      )}
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
