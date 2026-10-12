"use client";

import { useEffect, useState } from "react";
import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";
import { ArrowCounterClockwise, FloppyDisk, Pause, PaperPlaneRight, Play, Trash, X } from "@phosphor-icons/react";
import { useControleTeleprompter } from "@/hooks/useTeleprompter";
import { excluirRoteiro, listarRoteiros, salvarRoteiro, type Roteiro } from "@/lib/acoes/roteiros";
import { ehPonto } from "@/lib/participante";
import { LIMITE_ROTEIRO, posicaoAgora, TAMANHO, VELOCIDADE, type EstadoTeleprompter } from "@/lib/teleprompter";
import { MensagemErro } from "@/components/ui/Campo";
import { Secao } from "@/components/estudio/PainelMidia";

/**
 * Aba Roteiro do diretor: escreve (ou abre um roteiro salvo), escolhe quem recebe e
 * controla a rolagem. O texto aparece só na tela dessas pessoas, nunca na live.
 * `salvos`: o dono guarda roteiros; o diretor delegado usa sem salvar.
 */
export function PainelTeleprompter({ salvos }: { salvos: boolean }) {
  const { estado, alvos, enviar } = useControleTeleprompter();
  const { localParticipant } = useLocalParticipant();
  const pessoas = [localParticipant, ...useRemoteParticipants().filter((p) => !ehPonto(p.identity))];

  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);
  const [aviso, setAviso] = useState<string>();
  const [erro, setErro] = useState<string>();

  const carregar = async () => {
    const r = await listarRoteiros();
    setRoteiros(r.roteiros ?? []);
    setAviso(r.erro);
  };
  useEffect(() => {
    if (!salvos) return;
    void listarRoteiros().then((r) => {
      setRoteiros(r.roteiros ?? []);
      setAviso(r.erro);
    });
  }, [salvos]);

  const tentar = async (fn: () => Promise<void>) => {
    setErro(undefined);
    try {
      await fn();
    } catch {
      setErro("Não foi possível enviar. Verifique a conexão.");
    }
  };

  // Ajusta o que está no ar, congelando a posição atual antes.
  const ajustar = (parcial: Partial<EstadoTeleprompter>) =>
    estado &&
    tentar(() => enviar({ ...estado, posicao: posicaoAgora(estado, Date.now()), em: Date.now(), ...parcial }, alvos));

  const alternar = (id: string) => setEscolhidos((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  return (
    <div className="flex flex-col gap-6">
      <Secao titulo="Teleprompter" dica="O texto rola só na tela de quem você escolher. Nunca aparece na live.">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={LIMITE_ROTEIRO.titulo}
          placeholder="Título (ex.: Abertura)"
          aria-label="Título do roteiro"
          className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm focus:border-destaque focus:outline-none"
        />
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={LIMITE_ROTEIRO.texto}
          rows={7}
          placeholder="Escreva ou cole o texto que a pessoa vai ler."
          aria-label="Texto do roteiro"
          className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm leading-relaxed focus:border-destaque focus:outline-none"
        />

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-xs font-semibold text-texto-suave">Quem recebe</legend>
          <div className="flex flex-wrap gap-1.5">
            {pessoas.map((p) => {
              const marcado = escolhidos.includes(p.identity);
              return (
                <button
                  key={p.identity}
                  type="button"
                  role="checkbox"
                  aria-checked={marcado}
                  onClick={() => alternar(p.identity)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${marcado ? "bg-destaque/20 ring-1 ring-destaque" : "bg-white/[0.05] hover:bg-white/10"}`}
                >
                  {p.isLocal ? "Você" : p.name || "Participante"}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!texto.trim() || escolhidos.length === 0}
            onClick={() =>
              tentar(() =>
                enviar(
                  {
                    titulo: titulo.trim() || "Roteiro",
                    texto,
                    rodando: false,
                    velocidade: estado?.velocidade ?? VELOCIDADE.padrao,
                    tamanho: estado?.tamanho ?? TAMANHO.padrao,
                    posicao: 0,
                    em: Date.now(),
                  },
                  escolhidos,
                ),
              )
            }
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-destaque px-4 text-sm font-semibold text-destaque-texto hover:bg-destaque-forte disabled:opacity-40"
          >
            <PaperPlaneRight weight="bold" className="size-4" aria-hidden />
            Enviar teleprompter
          </button>
          {salvos && (
            <button
              type="button"
              disabled={!texto.trim()}
              onClick={async () => {
                const r = await salvarRoteiro(titulo, texto);
                setErro(r.erro);
                if (!r.erro) await carregar();
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-white/[0.06] px-3 text-sm font-medium ring-1 ring-white/10 ring-inset hover:bg-white/10 disabled:opacity-40"
            >
              <FloppyDisk weight="bold" className="size-4" aria-hidden />
              Salvar roteiro
            </button>
          )}
        </div>
        <MensagemErro>{erro}</MensagemErro>
      </Secao>

      {estado && (
        <Secao titulo="No teleprompter agora" dica={`${estado.titulo} · para ${alvos.length} ${alvos.length === 1 ? "pessoa" : "pessoas"}`}>
          <div className="flex flex-col gap-3 rounded-md bg-white/[0.04] p-3">
            <div className="flex flex-wrap gap-2">
              <Botao onClick={() => ajustar({ rodando: !estado.rodando })}>
                {estado.rodando ? <Pause weight="bold" className="size-4" /> : <Play weight="bold" className="size-4" />}
                {estado.rodando ? "Pausar" : "Rolar"}
              </Botao>
              <Botao onClick={() => ajustar({ posicao: 0, rodando: false })}>
                <ArrowCounterClockwise weight="bold" className="size-4" />
                Voltar ao início
              </Botao>
              <Botao onClick={() => tentar(() => enviar(null, alvos))}>
                <X weight="bold" className="size-4" />
                Fechar
              </Botao>
            </div>
            <Faixa rotulo="Velocidade" min={VELOCIDADE.min} max={VELOCIDADE.max} valor={estado.velocidade} aoMudar={(velocidade) => ajustar({ velocidade })} />
            <Faixa rotulo="Tamanho da letra" min={TAMANHO.min} max={TAMANHO.max} passo={4} valor={estado.tamanho} aoMudar={(tamanho) => ajustar({ tamanho })} />
          </div>
        </Secao>
      )}

      {salvos && (
        <Secao titulo="Roteiros salvos">
          <MensagemErro>{aviso}</MensagemErro>
          {roteiros.length === 0 && !aviso && <p className="text-sm text-texto-suave">Nenhum roteiro salvo ainda.</p>}
          <ul className="flex flex-col gap-1">
            {roteiros.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-md bg-white/[0.04] p-1.5 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setTitulo(r.titulo);
                    setTexto(r.texto);
                  }}
                  className="min-w-0 flex-1 truncate rounded px-1.5 py-1 text-left hover:bg-white/[0.06]"
                  title="Abrir no editor"
                >
                  {r.titulo}
                </button>
                <button
                  type="button"
                  aria-label={`Excluir ${r.titulo}`}
                  onClick={async () => {
                    await excluirRoteiro(r.id);
                    await carregar();
                  }}
                  className="rounded p-1 text-texto-suave hover:bg-no-ar/15 hover:text-no-ar"
                >
                  <Trash weight="bold" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </Secao>
      )}
    </div>
  );
}

function Botao({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] px-3 py-1.5 text-sm font-medium ring-1 ring-white/10 ring-inset hover:bg-white/10"
    >
      {children}
    </button>
  );
}

function Faixa(p: { rotulo: string; min: number; max: number; passo?: number; valor: number; aoMudar: (v: number) => void }) {
  return (
    <label className="flex items-center gap-3 text-xs font-semibold text-texto-suave">
      <span className="w-28 shrink-0">{p.rotulo}</span>
      <input
        type="range"
        min={p.min}
        max={p.max}
        step={p.passo ?? 1}
        value={p.valor}
        onChange={(e) => p.aoMudar(Number(e.target.value))}
        className="flex-1 accent-destaque"
      />
      <span className="w-8 text-right tabular-nums">{p.valor}</span>
    </label>
  );
}
