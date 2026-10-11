"use client";

import type { CSSProperties } from "react";
import type { ComentarioDestacado, CoresMarca } from "@/lib/cena";
import type { Banner, Tema } from "@/lib/estilo";

// Artes da live por tema (etiqueta, banner, comentário). Tamanhos em cqw do quadro.
// As cores vêm sempre das cores da marca; o tema só muda a forma.

const sombraTexto: CSSProperties = { textShadow: "0 0.15cqw 0.6cqw rgb(0 0 0 / 0.75)" };
const claro = (cor: string) => `color-mix(in srgb, ${cor} 45%, white)`;

type PropsEtiqueta = { nome: string; etiqueta: string; tema: Tema; cores: CoresMarca };

/** Nome (e etiqueta) de quem está no palco, no canto de baixo do quadro da pessoa. */
export function EtiquetaNome({ nome, etiqueta, tema, cores }: PropsEtiqueta) {
  if (tema === "minimo") {
    return (
      <div className="max-w-full text-white" style={sombraTexto}>
        <p className="truncate text-[1.5cqw] leading-tight font-semibold">{nome}</p>
        <span className="my-[0.3cqw] block h-[0.22cqw] w-[2.6cqw]" style={{ background: cores.primaria }} />
        {etiqueta && <p className="truncate text-[1.1cqw] leading-tight text-white/85">{etiqueta}</p>}
      </div>
    );
  }
  if (tema === "bloco") {
    return (
      <div className="flex max-w-full flex-col items-start">
        <p className="max-w-full truncate px-[0.9cqw] py-[0.35cqw] text-[1.45cqw] leading-tight font-bold text-white" style={{ background: cores.primaria }}>
          {nome}
        </p>
        {etiqueta && (
          <p className="max-w-full truncate px-[0.9cqw] py-[0.25cqw] text-[1.05cqw] leading-tight font-semibold text-white" style={{ background: cores.secundaria }}>
            {etiqueta}
          </p>
        )}
      </div>
    );
  }
  if (tema === "bolha") {
    return (
      <div className="max-w-full rounded-[1.4cqw] px-[1.1cqw] py-[0.5cqw] text-white shadow-[0_0.3cqw_1cqw_rgb(0_0_0/0.35)]" style={{ background: cores.primaria }}>
        <p className="truncate text-[1.45cqw] leading-tight font-semibold">{nome}</p>
        {etiqueta && <p className="truncate text-[1.05cqw] leading-tight text-white/85">{etiqueta}</p>}
      </div>
    );
  }
  // clássico
  return (
    <div
      className="max-w-full rounded-[0.3cqw] border-l-[0.35cqw] bg-[rgb(8_11_20/0.82)] px-[1cqw] py-[0.5cqw] backdrop-blur-md"
      style={{ borderColor: cores.primaria }}
    >
      <p className="truncate text-[1.45cqw] leading-tight font-semibold text-white">{nome}</p>
      {etiqueta && (
        <p className="truncate text-[1.05cqw] leading-tight" style={{ color: claro(cores.primaria) }}>
          {etiqueta}
        </p>
      )}
    </div>
  );
}

/** Banner na base do quadro: faixa fixa ou letreiro rolando. */
export function BannerLive({ banner, tema, cores }: { banner: Banner; tema: Tema; cores: CoresMarca }) {
  const fundo: Record<Tema, CSSProperties> = {
    bolha: { background: cores.primaria, borderRadius: "2cqw" },
    minimo: { background: "transparent" },
    classico: { background: "rgb(8 11 20 / 0.85)", borderLeft: `0.45cqw solid ${cores.primaria}`, borderRadius: "0.3cqw" },
    bloco: { background: cores.secundaria },
  };
  const texto =
    banner.estilo === "letreiro" ? (
      // Duas cópias seguidas: o letreiro roda sem emenda visível.
      <span className="flex w-max animate-[letreiro_var(--duracao)_linear_infinite] gap-[6cqw] whitespace-nowrap motion-reduce:animate-none">
        <span>{banner.texto}</span>
        <span aria-hidden>{banner.texto}</span>
      </span>
    ) : (
      <span className="line-clamp-2">{banner.texto}</span>
    );

  return (
    <div
      className="absolute inset-x-[3%] bottom-[3.5%] flex animate-[entrar_300ms_ease-out] items-center overflow-hidden px-[1.6cqw] py-[0.8cqw] text-[1.9cqw] leading-snug font-semibold text-white motion-reduce:animate-none"
      style={
        {
          ...fundo[tema],
          ...(tema === "minimo" ? sombraTexto : {}),
          "--duracao": `${Math.max(12, banner.texto.length * 0.35)}s`,
        } as CSSProperties
      }
    >
      {tema === "minimo" && <span className="mr-[1cqw] h-[2.4cqw] w-[0.3cqw] shrink-0" style={{ background: cores.primaria }} />}
      <div className="min-w-0 flex-1 overflow-hidden">{texto}</div>
    </div>
  );
}

/** Comentário em destaque (camada acima dos vídeos; sobe se houver banner). */
export function CartaoComentario({
  comentario,
  tema,
  cores,
  comBanner,
}: {
  comentario: ComentarioDestacado;
  tema: Tema;
  cores: CoresMarca;
  comBanner: boolean;
}) {
  const caixa: Record<Tema, CSSProperties> = {
    bolha: { background: cores.primaria, borderRadius: "1.6cqw" },
    minimo: { background: "rgb(0 0 0 / 0.35)", borderRadius: "0.6cqw" },
    classico: { background: "rgb(8 11 20 / 0.85)", borderLeft: `0.35cqw solid ${cores.primaria}`, borderRadius: "0.3cqw" },
    bloco: { background: cores.secundaria },
  };
  const corAutor = tema === "bolha" || tema === "bloco" ? "rgb(255 255 255 / 0.9)" : claro(cores.primaria);

  return (
    <div
      className="absolute left-[3%] flex max-w-[46%] animate-[entrar_300ms_ease-out] items-start gap-[1cqw] p-[1.1cqw] pr-[1.6cqw] shadow-[0_1cqw_3cqw_rgb(0_0_0/0.45)] backdrop-blur-md motion-reduce:animate-none"
      style={{ ...caixa[tema], bottom: comBanner ? "14%" : "5%" }}
    >
      {comentario.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto do autor no YouTube, tamanho fixo
        <img src={comentario.avatar} alt="" className="size-[3.4cqw] shrink-0 rounded-full" referrerPolicy="no-referrer" />
      ) : (
        <span
          className="flex size-[3.4cqw] shrink-0 items-center justify-center rounded-full text-[1.4cqw] font-bold text-white"
          style={{ background: tema === "bolha" ? cores.secundaria : cores.primaria }}
        >
          {comentario.autor.trim()[0]?.toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-[1.3cqw] leading-tight font-semibold" style={{ color: corAutor }}>
          {comentario.autor}
        </p>
        <p className="mt-[0.3cqw] line-clamp-4 text-[1.55cqw] leading-snug text-white">{comentario.texto}</p>
      </div>
    </div>
  );
}
