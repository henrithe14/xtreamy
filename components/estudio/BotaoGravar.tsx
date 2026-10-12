"use client";

import { useEffect, useRef, useState } from "react";
import { Record, Stop } from "@phosphor-icons/react";
import type { EstadoGravacao, MensagemGravacao } from "@/hooks/useGravacao";
import { Cronometro } from "@/components/estudio/ControlesLive";

/**
 * Diretor: abre a saída numa janela 16:9 que grava a live neste computador (com ou
 * sem transmissão no YouTube). Mostra o estado e permite parar daqui.
 */
export function BotaoGravar({ transmissaoId, codigo }: { transmissaoId: string; codigo?: string }) {
  const janela = useRef<Window | null>(null);
  const [estado, setEstado] = useState<EstadoGravacao | "fechada">("fechada");
  const [desde, setDesde] = useState<number>();

  useEffect(() => {
    const aoReceber = (e: MessageEvent<MensagemGravacao>) => {
      if (e.origin !== window.location.origin || e.data?.tipo !== "xtreamy-gravacao") return;
      setEstado(e.data.estado);
      if (e.data.desde) setDesde(e.data.desde);
    };
    window.addEventListener("message", aoReceber);
    // Janela fechada sem gravar: volta ao botão normal.
    const t = window.setInterval(() => {
      if (janela.current?.closed) {
        janela.current = null;
        setEstado("fechada");
      }
    }, 1000);
    return () => {
      window.removeEventListener("message", aoReceber);
      window.clearInterval(t);
    };
  }, []);

  function abrir() {
    if (janela.current && !janela.current.closed) {
      janela.current.focus();
      return;
    }
    janela.current = window.open(`/stage?t=${transmissaoId}&gravar=1${codigo ? `&c=${encodeURIComponent(codigo)}` : ""}`, `xtreamy-gravacao-${transmissaoId}`, "popup,width=1280,height=720");
    setEstado("pronto");
  }

  if (estado === "gravando") {
    return (
      <button
        type="button"
        onClick={() => janela.current?.postMessage({ tipo: "xtreamy-gravacao-parar" } satisfies MensagemGravacao, window.location.origin)}
        className="inline-flex min-h-9 items-center gap-2 rounded-md bg-no-ar/15 px-3 text-sm font-semibold text-no-ar ring-1 ring-no-ar/40 ring-inset hover:bg-no-ar/25"
      >
        <span className="tally-pulso size-2 rounded-full bg-no-ar" aria-hidden />
        Gravando {desde && <Cronometro desde={desde} />}
        <Stop weight="bold" className="size-4" aria-hidden />
        <span className="sr-only">Parar gravação</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={abrir}
      title="Grava a live neste computador, com ou sem transmitir no YouTube"
      className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white/[0.06] px-3 text-sm font-medium ring-1 ring-white/10 ring-inset hover:bg-white/10"
    >
      <Record weight="bold" className="size-4 text-no-ar" aria-hidden />
      {estado === "salvando" ? "Salvando…" : estado === "pronto" ? "Janela de gravação aberta" : "Gravar"}
    </button>
  );
}
