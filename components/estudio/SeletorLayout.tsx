"use client";

import { useEffect, useRef, useState } from "react";
import { LAYOUTS, TAMANHO_SOLO, type Layout, type Slot } from "@/lib/layouts";
import { POSICOES_CAMERAS, disporApresentacao, type PosicaoCameras } from "@/lib/apresentacao";

/** Quantas pessoas desenhar na miniatura quando o palco está vazio. */
const EXEMPLO: Record<string, number> = { solo: 1, "lado-a-lado": 2, grade: 4, destaque: 4, apresentacao: 2, "so-tela": 0 };

const LARGURA_MINI = 160;
const ALTURA_MINI = 90;

type Props = {
  layoutId: string;
  pessoasNoPalco: number;
  aoEscolher: (id: string) => void;
  tamanhoSolo: number;
  aoMudarTamanhoSolo: (tamanho: number) => void;
  posicaoCameras: PosicaoCameras;
  aoMudarPosicaoCameras: (posicao: PosicaoCameras) => void;
};

export function SeletorLayout({
  layoutId,
  pessoasNoPalco,
  aoEscolher,
  tamanhoSolo,
  aoMudarTamanhoSolo,
  posicaoCameras,
  aoMudarPosicaoCameras,
}: Props) {
  const atual = LAYOUTS.find((l) => l.id === layoutId);
  const sobra = atual ? pessoasNoPalco - atual.maxPessoas : 0;

  return (
    <section aria-labelledby="titulo-layouts" className="flex flex-col gap-3">
      <h2 id="titulo-layouts" className="text-sm font-semibold deitado:sr-only">
        Disposição
      </h2>
      <div role="radiogroup" aria-labelledby="titulo-layouts" className="flex flex-wrap gap-2">
        {LAYOUTS.map((layout) => (
          <BotaoLayout
            key={layout.id}
            layout={layout}
            ativo={layout.id === layoutId}
            aoEscolher={aoEscolher}
            pessoas={pessoasNoPalco}
            tamanho={layout.id === "solo" ? tamanhoSolo : undefined}
            posicao={posicaoCameras}
          />
        ))}
      </div>
      {layoutId === "solo" && <TamanhoSolo valor={tamanhoSolo} aoMudar={aoMudarTamanhoSolo} />}
      {atual?.comTela && (
        <PosicaoCameras atual={posicaoCameras} pessoas={pessoasNoPalco} aoMudar={aoMudarPosicaoCameras} />
      )}
      {sobra > 0 && atual && (
        <p className="text-sm text-ensaio">
          {atual.nome} mostra até {atual.maxPessoas} {atual.maxPessoas === 1 ? "pessoa" : "pessoas"}.{" "}
          {sobra === 1 ? "A última da lista fica" : `As ${sobra} últimas da lista ficam`} fora da live.
        </p>
      )}
    </section>
  );
}

/** Solo: diminuir a câmera deixa o fundo aparecer em volta. Muda a cena quando o arraste para. */
function TamanhoSolo({ valor, aoMudar }: { valor: number; aoMudar: (v: number) => void }) {
  const [local, setLocal] = useState(valor);
  const espera = useRef<number | undefined>(undefined);
  useEffect(() => {
    // Acompanha mudanças vindas da cena.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(valor);
  }, [valor]);

  return (
    <label className="flex max-w-md items-center gap-3 text-sm">
      <span className="shrink-0 font-medium text-texto-suave">Tamanho da câmera</span>
      <input
        type="range"
        min={TAMANHO_SOLO.min}
        max={TAMANHO_SOLO.max}
        step={1}
        value={local}
        onChange={(e) => {
          const v = Number(e.target.value);
          setLocal(v);
          window.clearTimeout(espera.current);
          espera.current = window.setTimeout(() => aoMudar(v), 200);
        }}
        className="flex-1 accent-destaque"
      />
      <span className="w-10 text-right font-semibold tabular-nums">{local}%</span>
    </label>
  );
}

/** Apresentação: onde ficam as câmeras em volta da tela (o tamanho se ajusta sozinho). */
function PosicaoCameras({ atual, pessoas, aoMudar }: { atual: PosicaoCameras; pessoas: number; aoMudar: (p: PosicaoCameras) => void }) {
  // Com 1 pessoa, "dos dois lados" e "em L" não fazem diferença; a miniatura mostra 3.
  const n = Math.min(6, Math.max(3, pessoas));
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium text-texto-suave">Câmeras na apresentação</legend>
      <div role="radiogroup" className="flex flex-wrap gap-1.5">
        {POSICOES_CAMERAS.map((p) => {
          const d = disporApresentacao(n, 16 / 9, p.id);
          const ativo = p.id === atual;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => aoMudar(p.id)}
              className={`flex flex-col items-center gap-1 rounded-md p-1.5 text-[0.7rem] font-medium ${
                ativo
                  ? "bg-destaque/15 text-texto ring-2 ring-destaque"
                  : "bg-white/[0.04] text-texto-suave ring-1 ring-white/10 hover:bg-white/[0.08] hover:text-texto"
              }`}
            >
              <Miniatura tela={d.tela} slots={d.pessoas} ativo={ativo} className="w-14" />
              {p.nome}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Miniatura({ tela, slots, ativo, className }: { tela?: Slot; slots: Slot[]; ativo: boolean; className: string }) {
  const L = LARGURA_MINI;
  const A = ALTURA_MINI;
  return (
    <svg viewBox={`0 0 ${L} ${A}`} className={`rounded-sm bg-black/30 ${className}`} aria-hidden>
      {/* Tela compartilhada: retângulo vazado, para diferenciar das pessoas. */}
      {tela && (
        <rect
          x={(tela.x / 100) * L + 1.5}
          y={(tela.y / 100) * A + 1.5}
          width={Math.max(0, (tela.w / 100) * L - 3)}
          height={Math.max(0, (tela.h / 100) * A - 3)}
          rx="3"
          strokeWidth="1.5"
          className={ativo ? "fill-destaque/20 stroke-destaque" : "fill-white/5 stroke-white/40"}
        />
      )}
      {slots.map((s, i) => (
        <rect
          key={i}
          x={(s.x / 100) * L + 1}
          y={(s.y / 100) * A + 1}
          width={Math.max(0, (s.w / 100) * L - 2)}
          height={Math.max(0, (s.h / 100) * A - 2)}
          rx="3"
          className={ativo ? "fill-destaque/70" : "fill-white/25"}
        />
      ))}
    </svg>
  );
}

type PropsBotao = {
  layout: Layout;
  ativo: boolean;
  aoEscolher: (id: string) => void;
  pessoas: number;
  tamanho?: number;
  posicao: PosicaoCameras;
};

function BotaoLayout({ layout, ativo, aoEscolher, pessoas, tamanho, posicao }: PropsBotao) {
  // A miniatura mostra como fica com quem está no palco agora.
  const n = pessoas > 0 ? Math.min(pessoas, layout.maxPessoas) : (EXEMPLO[layout.id] ?? Math.min(layout.maxPessoas, 4));
  const comTela = layout.comTela?.(n, 16 / 9, posicao);
  const slots = comTela?.pessoas ?? layout.slots(n, tamanho);
  const tela = comTela?.tela ?? layout.apresentacao?.(n);
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
      <Miniatura tela={tela} slots={slots} ativo={ativo} className="w-20 deitado:w-12" />
      {layout.nome}
    </button>
  );
}
