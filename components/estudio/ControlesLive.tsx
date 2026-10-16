"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Broadcast, Pause, Play, Stop, WarningCircle } from "@phosphor-icons/react";
import type { EstadoTransmissor, MensagemTransmissao } from "@/hooks/useTransmissor";
import type { Cena } from "@/lib/cena";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";
import { MensagemErro } from "@/components/ui/Campo";

type Acao = "iniciar" | "intervalo" | "retomar" | "encerrar";

const EM_ANDAMENTO: Record<Acao, string> = {
  iniciar: "Conectando ao YouTube… pode levar até 1 minuto",
  intervalo: "Entrando em intervalo…",
  retomar: "Voltando ao ar…",
  encerrar: "Encerrando…",
};

/** Cronômetro desde que a live entrou no ar (hh:mm:ss). */
export function Cronometro({ desde }: { desde: number }) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((agora - desde) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="tabular-nums">
      {pad(Math.floor(s / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}
    </span>
  );
}

/** Botões do diretor: Iniciar / Intervalo / Retomar / Encerrar. */
type PropsControles = {
  transmissaoId: string;
  codigo?: string;
  cena: Cena;
  temCanal: boolean;
  /** Sem Egress: uma janela deste computador envia a live (ao repetidor). */
  peloNavegador: boolean;
};

/**
 * Janela de transmissão (pelo navegador): abre, acompanha o estado e pede para parar.
 * `aoComecarEnvio` é chamado na primeira vez que ela começa a enviar.
 */
function useJanelaTransmissao(transmissaoId: string, codigo: string | undefined, aoComecarEnvio: () => void) {
  const janela = useRef<Window | null>(null);
  const [estado, setEstado] = useState<EstadoTransmissor | "fechada">("fechada");
  const [aviso, setAviso] = useState<string>();
  const esperandoEnvio = useRef(false);
  const aoComecar = useRef(aoComecarEnvio);
  useEffect(() => {
    aoComecar.current = aoComecarEnvio;
  });

  useEffect(() => {
    const aoReceber = (e: MessageEvent<MensagemTransmissao>) => {
      if (e.origin !== window.location.origin || e.data?.tipo !== "xtreamy-transmissao") return;
      setEstado(e.data.estado);
      setAviso(e.data.erro);
      if (e.data.estado === "enviando" && esperandoEnvio.current) {
        esperandoEnvio.current = false;
        aoComecar.current();
      }
    };
    window.addEventListener("message", aoReceber);
    const t = window.setInterval(() => {
      if (janela.current?.closed) {
        janela.current = null;
        esperandoEnvio.current = false;
        setEstado("fechada");
      }
    }, 1000);
    return () => {
      window.removeEventListener("message", aoReceber);
      window.clearInterval(t);
    };
  }, []);

  /** Abre (ou traz para frente). Precisa ser chamado dentro do clique (bloqueio de pop-up). */
  const abrir = useCallback(
    (iniciarAoEnviar: boolean) => {
      esperandoEnvio.current = iniciarAoEnviar;
      if (janela.current && !janela.current.closed) {
        janela.current.focus();
        return true;
      }
      const url = `/stage?t=${transmissaoId}&transmitir=1${codigo ? `&c=${encodeURIComponent(codigo)}` : ""}`;
      janela.current = window.open(url, `xtreamy-transmissao-${transmissaoId}`, "popup,width=1280,height=720");
      if (!janela.current) {
        esperandoEnvio.current = false;
        return false;
      }
      setEstado("pronto");
      setAviso(undefined);
      return true;
    },
    [transmissaoId, codigo],
  );

  const parar = useCallback(() => {
    janela.current?.postMessage({ tipo: "xtreamy-transmissao-parar" } satisfies MensagemTransmissao, window.location.origin);
  }, []);

  return { estado, aviso, abrir, parar };
}

export function ControlesLive({ transmissaoId, codigo, cena, temCanal, peloNavegador }: PropsControles) {
  const [executando, setExecutando] = useState<Acao>();
  const [erro, setErro] = useState<string>();
  const [confirmarFim, setConfirmarFim] = useState(false);
  const transmissao = useJanelaTransmissao(transmissaoId, codigo, () => void executar("iniciar"));
  const noAr = cena.status === "ao_vivo" || cena.status === "intervalo";

  function iniciar() {
    if (!peloNavegador || transmissao.estado === "enviando") {
      void executar("iniciar");
      return;
    }
    setErro(undefined);
    if (!transmissao.abrir(true)) setErro("O navegador bloqueou a janela de transmissão. Permita pop-ups para este site e tente de novo.");
  }

  async function executar(acao: Acao) {
    setExecutando(acao);
    setErro(undefined);
    try {
      const r = await fetch(`/api/live/${acao}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transmissaoId, codigo }),
      });
      if (!r.ok) {
        const dados = (await r.json().catch(() => ({}))) as { erro?: string };
        setErro(dados.erro ?? "Não foi possível concluir.");
      } else if (acao === "encerrar") {
        transmissao.parar();
      }
    } catch {
      setErro("Sem conexão com o servidor.");
    } finally {
      setExecutando(undefined);
    }
  }

  if (cena.status === "encerrada") return <span className="text-sm text-texto-suave">Live encerrada</span>;

  return (
    <div className="flex items-center gap-2">
      {executando && (
        <span role="status" className="hidden text-sm text-texto-suave md:inline">
          {EM_ANDAMENTO[executando]}
        </span>
      )}
      {erro && (
        <span role="alert" className="max-w-[22rem] text-sm text-no-ar" title={erro}>
          {erro}
        </span>
      )}
      {peloNavegador && !executando && cena.status === "ensaio" && transmissao.estado === "pronto" && (
        <span role="status" className="max-w-[22rem] text-sm text-texto-suave">
          Na janela que abriu, clique em Começar a transmissão e escolha aquela aba.
        </span>
      )}
      {peloNavegador && noAr && transmissao.estado !== "enviando" && (
        <span role="alert" className="flex items-center gap-2 text-sm font-semibold text-no-ar">
          <WarningCircle weight="bold" className="size-4" aria-hidden />
          {transmissao.estado === "reconectando" ? "Sinal caiu, reconectando…" : "Sem sinal da janela de transmissão"}
          {(transmissao.estado === "fechada" || transmissao.estado === "parado" || transmissao.estado === "erro") && (
            <button type="button" onClick={() => transmissao.abrir(false)} className="rounded px-2 py-1 underline hover:bg-white/10">
              Abrir de novo
            </button>
          )}
        </span>
      )}
      {peloNavegador && transmissao.aviso && transmissao.estado === "enviando" && (
        <span role="status" className="max-w-[18rem] text-sm text-ensaio">
          {transmissao.aviso}
        </span>
      )}

      {cena.status === "ensaio" && (
        <Botao
          variante="no-ar"
          onClick={iniciar}
          disabled={!temCanal || Boolean(executando)}
          title={temCanal ? undefined : "Esta transmissão não tem canal do YouTube"}
        >
          <Broadcast weight="bold" aria-hidden />
          {executando === "iniciar" ? "Iniciando…" : "Iniciar live"}
        </Botao>
      )}
      {cena.status === "ao_vivo" && (
        <Botao variante="secundario" onClick={() => void executar("intervalo")} disabled={Boolean(executando)}>
          <Pause weight="bold" aria-hidden />
          Intervalo
        </Botao>
      )}
      {cena.status === "intervalo" && (
        <Botao onClick={() => void executar("retomar")} disabled={Boolean(executando)}>
          <Play weight="bold" aria-hidden />
          Retomar
        </Botao>
      )}
      {(cena.status === "ao_vivo" || cena.status === "intervalo") && (
        <Botao variante="fantasma" onClick={() => setConfirmarFim(true)} disabled={Boolean(executando)}>
          <Stop weight="bold" aria-hidden />
          Encerrar
        </Botao>
      )}

      <Dialogo aberto={confirmarFim} aoFechar={() => setConfirmarFim(false)} titulo="Encerrar a live?">
        <p className="mb-2">A transmissão para no YouTube e não pode ser retomada.</p>
        <p className="mb-4 text-sm text-texto-suave">A gravação fica no seu canal. A sala continua aberta para a equipe.</p>
        <MensagemErro>{erro}</MensagemErro>
        <div className="mt-2 flex justify-end gap-2">
          <Botao variante="secundario" onClick={() => setConfirmarFim(false)}>
            Continuar no ar
          </Botao>
          <Botao
            variante="no-ar"
            onClick={() => {
              setConfirmarFim(false);
              void executar("encerrar");
            }}
          >
            Encerrar live
          </Botao>
        </div>
      </Dialogo>
    </div>
  );
}
