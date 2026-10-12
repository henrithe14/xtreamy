"use client";

import { useEffect, useState } from "react";
import { Broadcast, Pause, Play, Stop } from "@phosphor-icons/react";
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
type PropsControles = { transmissaoId: string; codigo?: string; cena: Cena; temCanal: boolean };

export function ControlesLive({ transmissaoId, codigo, cena, temCanal }: PropsControles) {
  const [executando, setExecutando] = useState<Acao>();
  const [erro, setErro] = useState<string>();
  const [confirmarFim, setConfirmarFim] = useState(false);

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

      {cena.status === "ensaio" && (
        <Botao
          variante="no-ar"
          onClick={() => void executar("iniciar")}
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
