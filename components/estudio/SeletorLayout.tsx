"use client";

import { LAYOUTS, type Layout } from "@/lib/layouts";

/** Quantas pessoas desenhar na miniatura de cada layout. */
const EXEMPLO: Record<string, number> = { solo: 1, "lado-a-lado": 2, grade: 4, destaque: 4 };

type Props = {
  layoutId: string;
  pessoasNoPalco: number;
  aoEscolher: (id: string) => void;
};

export function SeletorLayout({ layoutId, pessoasNoPalco, aoEscolher }: Props) {
  const atual = LAYOUTS.find((l) => l.id === layoutId);
  const sobra = atual ? pessoasNoPalco - atual.maxPessoas : 0;

  return (
    <section aria-labelledby="titulo-layouts" className="flex flex-col gap-3">
      <h2 id="titulo-layouts" className="text-sm font-semibold deitado:sr-only">
        Disposição
      </h2>
      <div role="radiogroup" aria-labelledby="titulo-layouts" className="flex flex-wrap gap-2">
        {LAYOUTS.map((layout) => (
          <BotaoLayout key={layout.id} layout={layout} ativo={layout.id === layoutId} aoEscolher={aoEscolher} />
        ))}
      </div>
      {sobra > 0 && atual && (
        <p className="text-sm text-ensaio">
          {atual.nome} mostra até {atual.maxPessoas} {atual.maxPessoas === 1 ? "pessoa" : "pessoas"}.{" "}
          {sobra === 1 ? "A última da lista fica" : `As ${sobra} últimas da lista ficam`} fora da live.
        </p>
      )}
    </section>
  );
}

function BotaoLayout({ layout, ativo, aoEscolher }: { layout: Layout; ativo: boolean; aoEscolher: (id: string) => void }) {
  const slots = layout.slots(EXEMPLO[layout.id] ?? Math.min(layout.maxPessoas, 4));
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativo}
      onClick={() => aoEscolher(layout.id)}
      className={`flex flex-col items-center gap-1.5 rounded-md p-2 text-xs font-medium transition-colors ${
        ativo
          ? "bg-destaque/15 text-texto ring-2 ring-destaque"
          : "bg-white/[0.04] text-texto-suave ring-1 ring-white/10 hover:bg-white/[0.08] hover:text-texto"
      }`}
    >
      <svg viewBox="0 0 160 90" className="w-20 rounded-sm bg-black/30 deitado:w-12" aria-hidden>
        {slots.map((s, i) => (
          <rect
            key={i}
            x={(s.x / 100) * 160 + 1}
            y={(s.y / 100) * 90 + 1}
            width={(s.w / 100) * 160 - 2}
            height={(s.h / 100) * 90 - 2}
            rx="3"
            className={ativo ? "fill-destaque/70" : "fill-white/25"}
          />
        ))}
      </svg>
      {layout.nome}
    </button>
  );
}
