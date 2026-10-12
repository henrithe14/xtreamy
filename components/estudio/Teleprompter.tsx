"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, CaretDown, Minus, Pause, Play, Plus, TextAa, Scroll } from "@phosphor-icons/react";
import { useTeleprompterRecebido } from "@/hooks/useTeleprompter";
import { posicaoAgora, TAMANHO, VELOCIDADE, type EstadoTeleprompter } from "@/lib/teleprompter";

/**
 * Teleprompter de quem recebe: faixa no alto da tela (perto da câmera, para manter o
 * olhar) com rolagem automática. Os controles daqui mudam só esta tela; o diretor
 * pode mudar de novo a qualquer momento. Nunca aparece na live.
 */
export function TeleprompterRecebido() {
  const recebido = useTeleprompterRecebido();
  const [local, setLocal] = useState<EstadoTeleprompter | null>(recebido);
  const [minimizado, setMinimizado] = useState(false);

  // Cada envio do diretor substitui os ajustes locais.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(recebido);
    if (recebido) setMinimizado(false);
  }, [recebido]);

  if (!local) return null;

  if (minimizado) {
    return (
      <button
        type="button"
        onClick={() => setMinimizado(false)}
        className="fixed top-16 left-1/2 z-40 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur"
      >
        <Scroll weight="bold" className="size-4" aria-hidden />
        Abrir teleprompter
      </button>
    );
  }

  return <Faixa estado={local} mudar={(fn) => setLocal((e) => (e ? fn(e) : e))} aoMinimizar={() => setMinimizado(true)} />;
}

type PropsFaixa = {
  estado: EstadoTeleprompter;
  mudar: (fn: (e: EstadoTeleprompter) => EstadoTeleprompter) => void;
  aoMinimizar: () => void;
};

function Faixa({ estado, mudar, aoMinimizar }: PropsFaixa) {
  const texto = useRef<HTMLDivElement>(null);

  // Rolagem: a posição sai do horário (posicaoAgora), então nada se perde entre quadros.
  useEffect(() => {
    let quadro = 0;
    const desenhar = () => {
      if (texto.current) texto.current.style.transform = `translateY(${-posicaoAgora(estado, Date.now()) * estado.tamanho}px)`;
      if (estado.rodando) quadro = requestAnimationFrame(desenhar);
    };
    desenhar();
    return () => cancelAnimationFrame(quadro);
  }, [estado]);

  // Congela a posição atual e aplica a mudança (pausar, velocidade…).
  const ajustar = (parcial: Partial<EstadoTeleprompter>) =>
    mudar((e) => ({ ...e, posicao: posicaoAgora(e, Date.now()), em: Date.now(), ...parcial }));

  return (
    <section
      aria-label="Teleprompter"
      className="fixed top-14 left-1/2 z-40 flex h-[38dvh] w-[min(94vw,56rem)] -translate-x-1/2 flex-col overflow-hidden rounded-b-xl bg-black/85 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md"
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Linha de leitura: o texto passa por ela. */}
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-[30%] z-10 h-px bg-destaque/60" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-black/90 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 bg-gradient-to-t from-black/90 to-transparent" />
        <div
          ref={texto}
          className="px-6 pt-[calc(38dvh*0.3-0.6em)] pb-[40dvh] text-center leading-[1.4] font-semibold whitespace-pre-wrap will-change-transform"
          style={{ fontSize: estado.tamanho }}
        >
          {estado.texto}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1 border-t border-white/10 bg-black/60 px-2 py-1.5 text-xs">
        <span className="mr-auto max-w-[30%] truncate px-2 font-semibold text-white/70">{estado.titulo}</span>
        <Controle rotulo={estado.rodando ? "Pausar" : "Rolar"} onClick={() => ajustar({ rodando: !estado.rodando })}>
          {estado.rodando ? <Pause weight="bold" /> : <Play weight="bold" />}
        </Controle>
        <Controle rotulo="Voltar ao início" onClick={() => ajustar({ posicao: 0, rodando: false })}>
          <ArrowCounterClockwise weight="bold" />
        </Controle>
        <span className="mx-1 text-white/50">Velocidade</span>
        <Controle rotulo="Mais devagar" onClick={() => ajustar({ velocidade: Math.max(VELOCIDADE.min, estado.velocidade - 1) })}>
          <Minus weight="bold" />
        </Controle>
        <span className="w-4 text-center tabular-nums">{estado.velocidade}</span>
        <Controle rotulo="Mais rápido" onClick={() => ajustar({ velocidade: Math.min(VELOCIDADE.max, estado.velocidade + 1) })}>
          <Plus weight="bold" />
        </Controle>
        <TextAa weight="bold" className="mx-1 size-4 text-white/50" aria-hidden />
        <Controle rotulo="Letra menor" onClick={() => ajustar({ tamanho: Math.max(TAMANHO.min, estado.tamanho - 4) })}>
          <Minus weight="bold" />
        </Controle>
        <Controle rotulo="Letra maior" onClick={() => ajustar({ tamanho: Math.min(TAMANHO.max, estado.tamanho + 4) })}>
          <Plus weight="bold" />
        </Controle>
        <Controle rotulo="Minimizar" onClick={aoMinimizar}>
          <CaretDown weight="bold" />
        </Controle>
      </div>
    </section>
  );
}

function Controle({ rotulo, onClick, children }: { rotulo: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      className="inline-flex size-8 items-center justify-center rounded-md text-white/85 hover:bg-white/10 hover:text-white [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
