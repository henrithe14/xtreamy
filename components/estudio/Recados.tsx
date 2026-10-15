"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRemoteParticipants } from "@livekit/components-react";
import type { Participant } from "livekit-client";
import { CheckSquare, PaperPlaneTilt, Square, X } from "@phosphor-icons/react";
import { useEnviarRecado, useRecadosRecebidos, type Recado } from "@/hooks/useRecados";
import { ehPonto } from "@/lib/participante";
import { LIMITE_RECADO } from "@/lib/recado";
import { Botao } from "@/components/ui/Botao";
import { BotaoBarra } from "@/components/estudio/BotaoBarra";

type ContextoRecados = {
  /** Modo de escolher várias pessoas (segurar o botão de recado). */
  selecionando: boolean;
  selecionados: string[];
  abrir: (destinos: string[]) => void;
  iniciarSelecao: (identity: string) => void;
  alternar: (identity: string) => void;
};

const Contexto = createContext<ContextoRecados | null>(null);

/**
 * Recados privados: qualquer pessoa manda para uma ou várias outras. Envolve o estúdio e
 * desenha a seleção, a caixa de escrever e os recados recebidos.
 */
export function ProvedorRecados({ children }: { children: React.ReactNode }) {
  const [selecionando, setSelecionando] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [compondo, setCompondo] = useState<string[] | null>(null);

  const alternar = (identity: string) =>
    setSelecionados((atual) => (atual.includes(identity) ? atual.filter((x) => x !== identity) : [...atual, identity]));
  const sairDaSelecao = () => {
    setSelecionando(false);
    setSelecionados([]);
  };

  const contexto: ContextoRecados = {
    selecionando,
    selecionados,
    abrir: (destinos) => {
      sairDaSelecao();
      setCompondo(destinos);
    },
    iniciarSelecao: (identity) => {
      setSelecionando(true);
      setSelecionados([identity]);
    },
    alternar,
  };

  return (
    <Contexto.Provider value={contexto}>
      {children}
      {selecionando && (
        <div
          role="status"
          className="vidro-forte fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-md flex-wrap items-center gap-2 rounded-xl p-3 shadow-2xl"
        >
          <span className="flex-1 text-sm">
            {selecionados.length === 0
              ? "Toque no recado de cada pessoa para escolher."
              : `${selecionados.length} ${selecionados.length === 1 ? "pessoa escolhida" : "pessoas escolhidas"}`}
          </span>
          <Botao variante="secundario" onClick={sairDaSelecao}>
            Cancelar
          </Botao>
          <Botao disabled={selecionados.length === 0} onClick={() => contexto.abrir(selecionados)}>
            Escrever
          </Botao>
        </div>
      )}
      {compondo && <CaixaRecado destinosIniciais={compondo} aoFechar={() => setCompondo(null)} />}
      <RecadosRecebidos />
    </Contexto.Provider>
  );
}

/** Pessoas que podem receber recado (todos menos eu e a conexão do ponto). */
function usePessoasDaSala() {
  return useRemoteParticipants().filter((p) => !ehPonto(p.identity));
}

const SEGURAR_MS = 450;

/**
 * Ícone de recado em cima da câmera de cada pessoa (prévia e Pessoas). Clicar escreve só
 * para ela; segurar abre a escolha de várias pessoas.
 */
export function BotaoRecado({ participante, className = "" }: { participante: Participant; className?: string }) {
  const contexto = useContext(Contexto);
  const timer = useRef<number | undefined>(undefined);
  const segurou = useRef(false);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!contexto || participante.isLocal || ehPonto(participante.identity)) return null;

  const { selecionando, selecionados, abrir, iniciarSelecao, alternar } = contexto;
  const identity = participante.identity;
  const nome = participante.name || "esta pessoa";
  const escolhido = selecionados.includes(identity);

  return (
    <button
      type="button"
      title={selecionando ? undefined : "Recado privado (segure para escolher várias pessoas)"}
      aria-label={selecionando ? `Escolher ${nome}` : `Mandar recado privado para ${nome}`}
      aria-pressed={selecionando ? escolhido : undefined}
      onPointerDown={() => {
        segurou.current = false;
        window.clearTimeout(timer.current);
        if (selecionando) return;
        timer.current = window.setTimeout(() => {
          segurou.current = true;
          iniciarSelecao(identity);
        }, SEGURAR_MS);
      }}
      onPointerUp={() => window.clearTimeout(timer.current)}
      onPointerLeave={() => window.clearTimeout(timer.current)}
      // Segurar no celular abre o menu do navegador; aqui não.
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        if (segurou.current) return;
        if (selecionando) alternar(identity);
        else abrir([identity]);
      }}
      className={`pointer-events-auto inline-flex size-7 touch-none items-center justify-center rounded-md backdrop-blur-sm transition-colors select-none [&_svg]:size-4 ${
        selecionando && escolhido
          ? "bg-destaque text-destaque-texto"
          : "bg-black/55 text-white hover:bg-black/75"
      } ${className}`}
    >
      {selecionando ? (
        escolhido ? (
          <CheckSquare weight="bold" />
        ) : (
          <Square weight="bold" />
        )
      ) : (
        <PaperPlaneTilt weight="bold" />
      )}
    </button>
  );
}

/** Botão da barra: abre a caixa de recado escolhendo as pessoas numa lista (inclusive o bastidor). */
export function BotaoRecadoBarra() {
  const contexto = useContext(Contexto);
  const pessoas = usePessoasDaSala();
  if (!contexto || pessoas.length === 0) return null;
  return (
    <BotaoBarra rotulo="Recado" onClick={() => contexto.abrir([])}>
      <PaperPlaneTilt weight="bold" />
    </BotaoBarra>
  );
}

function CaixaRecado({ destinosIniciais, aoFechar }: { destinosIniciais: string[]; aoFechar: () => void }) {
  const pessoas = usePessoasDaSala();
  const enviar = useEnviarRecado();
  const [destinos, setDestinos] = useState(destinosIniciais);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Quem saiu da sala deixa de ser destino.
  const validos = destinos.filter((id) => pessoas.some((p) => p.identity === id));

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  async function mandar() {
    if (validos.length === 0 || !texto.trim()) return;
    setEnviando(true);
    setErro(null);
    try {
      await enviar(validos, texto);
      aoFechar();
    } catch {
      setErro("Não foi possível enviar. Tente de novo.");
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={aoFechar}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-recado"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          void mandar();
        }}
        className="vidro-forte flex w-full max-w-md flex-col gap-3 rounded-xl p-4 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id="titulo-recado" className="font-semibold tracking-tight">
            Recado privado
          </h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="rounded-md p-1 text-texto-suave hover:bg-white/10 hover:text-texto">
            <X weight="bold" className="size-5" />
          </button>
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm text-texto-suave">Para quem</legend>
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {pessoas.map((p) => {
              const marcado = destinos.includes(p.identity);
              return (
                <label
                  key={p.identity}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm ring-1 ring-inset ${
                    marcado ? "bg-destaque/20 ring-destaque" : "bg-white/[0.06] ring-white/10 hover:bg-white/10"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={marcado}
                    onChange={() =>
                      setDestinos((atual) => (marcado ? atual.filter((x) => x !== p.identity) : [...atual, p.identity]))
                    }
                  />
                  {marcado ? <CheckSquare weight="bold" className="size-4" aria-hidden /> : <Square weight="bold" className="size-4" aria-hidden />}
                  {p.name || "Participante"}
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className="sr-only">Mensagem</span>
          <textarea
            autoFocus
            rows={3}
            value={texto}
            maxLength={LIMITE_RECADO}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              // Enter envia; Shift+Enter pula linha.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void mandar();
              }
            }}
            placeholder="Só quem você escolheu vê. Não vai para a live."
            className="resize-none rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm focus:border-destaque focus:outline-none"
          />
          <span className="self-end text-xs text-texto-suave tabular-nums">
            {texto.length}/{LIMITE_RECADO}
          </span>
        </label>
        {erro && (
          <p role="alert" className="text-sm text-no-ar">
            {erro}
          </p>
        )}
        <Botao type="submit" disabled={enviando || validos.length === 0 || !texto.trim()}>
          <PaperPlaneTilt weight="bold" />
          {validos.length > 1 ? `Enviar para ${validos.length} pessoas` : "Enviar"}
        </Botao>
      </form>
    </div>
  );
}

/** Recados que chegaram: no alto da tela, perto da câmera, e somem depois do tempo de leitura. */
function RecadosRecebidos() {
  const { recados, fechar } = useRecadosRecebidos();
  if (recados.length === 0) return null;
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-3 top-3 z-50 mx-auto flex max-w-lg flex-col gap-2">
      {recados.map((r) => (
        <CartaoRecado key={r.id} recado={r} fechar={fechar} />
      ))}
    </div>
  );
}

function CartaoRecado({ recado, fechar }: { recado: Recado; fechar: (id: string) => void }) {
  useEffect(() => {
    const t = window.setTimeout(() => fechar(recado.id), recado.duracao);
    return () => window.clearTimeout(t);
  }, [recado.id, recado.duracao, fechar]);
  const aoFechar = () => fechar(recado.id);

  return (
    <div role="status" className="vidro-forte pointer-events-auto relative overflow-hidden rounded-xl p-3 pr-10 shadow-2xl">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <PaperPlaneTilt weight="bold" className="size-4 text-destaque" aria-hidden />
        Recado de {recado.de}
      </p>
      <p className="mt-1 text-base break-words whitespace-pre-wrap">{recado.texto}</p>
      <button
        type="button"
        onClick={aoFechar}
        aria-label="Fechar recado"
        className="absolute top-2 right-2 rounded-md p-1 text-texto-suave hover:bg-white/10 hover:text-texto"
      >
        <X weight="bold" className="size-4" />
      </button>
      {/* Tempo que falta para o recado sair. */}
      <span
        aria-hidden
        className="recado-tempo absolute bottom-0 left-0 h-0.5 w-full origin-left bg-destaque"
        style={{ animationDuration: `${recado.duracao}ms` }}
      />
    </div>
  );
}
