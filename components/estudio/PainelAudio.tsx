"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { MusicNotes, Pause, Play, SkipForward, SpeakerHigh, Stop, Trash } from "@phosphor-icons/react";
import { excluirAtivo, listarAtivos, type Ativo } from "@/lib/acoes/ativos";
import { codificarEfeito, lerDuracaoUrl, tocarEfeito, TOPICO_EFEITO } from "@/lib/audioLive";
import {
  posicaoMusica,
  posicionarMusica,
  MAX_FAIXAS,
  type Cena,
  type FaixaMusica,
  type Musica,
  type NivelDucking,
} from "@/lib/cena";
import { MensagemErro } from "@/components/ui/Campo";
import { Envio, Secao } from "@/components/estudio/PainelMidia";

type Alterar = (mudanca: (atual: Cena) => Omit<Cena, "versao">) => void;

const DUCKING: { id: NivelDucking; nome: string }[] = [
  { id: "desligado", nome: "Desligado" },
  { id: "leve", nome: "Leve" },
  { id: "forte", nome: "Forte" },
];

const CHAVE_VOLUME_EFEITOS = "estudio:volume-efeitos";

/** Aba Áudio do diretor: música de fundo (playlist) e efeitos sonoros. */
export function PainelAudio({ cena, alterar, ouvindo }: { cena: Cena; alterar: Alterar; ouvindo: boolean }) {
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [aviso, setAviso] = useState<string>();

  const carregar = useCallback(async () => {
    const r = await listarAtivos();
    setAtivos(r.ativos ?? []);
    setAviso(r.erro);
  }, []);

  useEffect(() => {
    void listarAtivos().then((r) => {
      setAtivos(r.ativos ?? []);
      setAviso(r.erro);
    });
  }, []);

  const excluir = async (a: Ativo) => {
    await excluirAtivo(a.id);
    if (a.tipo === "musica") alterar((c) => ({ ...c, musica: semFaixa(c.musica, a.url) }));
    await carregar();
  };

  return (
    <div className="flex flex-col gap-6">
      <MensagemErro>{aviso}</MensagemErro>
      <SecaoMusica
        cena={cena}
        alterar={alterar}
        musicas={ativos.filter((a) => a.tipo === "musica")}
        aoEnviar={carregar}
        aoExcluir={excluir}
      />
      <SecaoEfeitos efeitos={ativos.filter((a) => a.tipo === "efeito")} ouvindo={ouvindo} aoEnviar={carregar} aoExcluir={excluir} />
    </div>
  );
}

/** Tira uma faixa da playlist sem pular a que está tocando (se não for ela). */
function semFaixa(m: Musica | null, url: string): Musica | null {
  if (!m || !m.faixas.some((f) => f.url === url)) return m;
  const faixas = m.faixas.filter((f) => f.url !== url);
  if (faixas.length === 0) return null;
  const agora = Date.now();
  const { indice, offsetSeg } = posicaoMusica(m, agora);
  const tocando = m.faixas[indice].url;
  if (tocando === url) return posicionarMusica(m, faixas, indice % faixas.length, 0, agora);
  return posicionarMusica(m, faixas, faixas.findIndex((f) => f.url === tocando), offsetSeg, agora);
}

type PropsMusica = {
  cena: Cena;
  alterar: Alterar;
  musicas: Ativo[];
  aoEnviar: () => void;
  aoExcluir: (a: Ativo) => void;
};

function SecaoMusica({ cena, alterar, musicas, aoEnviar, aoExcluir }: PropsMusica) {
  const [preparando, setPreparando] = useState(false);
  const [erro, setErro] = useState<string>();
  const m = cena.musica;
  const agora = useRelogio(1000);
  const atual = m && agora ? m.faixas[posicaoMusica(m, agora).indice]?.url : undefined;

  // A playlist é a lista de músicas enviadas, a partir da escolhida, em loop.
  async function tocarDesde(a: Ativo) {
    setErro(undefined);
    setPreparando(true);
    try {
      const faixas: FaixaMusica[] = [];
      for (const item of musicas.slice(0, MAX_FAIXAS)) {
        const duracao = item.duracao ?? (await lerDuracaoUrl(item.url));
        if (duracao) faixas.push({ url: item.url, duracao });
      }
      const indice = faixas.findIndex((f) => f.url === a.url);
      if (indice < 0) {
        setErro("Não foi possível ler essa música. Envie de novo.");
        return;
      }
      alterar((c) => ({
        ...c,
        musica: posicionarMusica(
          { pausadaEm: null, volume: c.musica?.volume ?? 0.35, ducking: c.musica?.ducking ?? "leve" },
          faixas,
          indice,
          0,
          Date.now(),
        ),
      }));
    } finally {
      setPreparando(false);
    }
  }

  const mudar = (fn: (m: Musica) => Musica) => alterar((c) => ({ ...c, musica: c.musica && fn(c.musica) }));

  return (
    <Secao titulo="Música de fundo" dica="Toca na live em loop, pela lista abaixo. Baixa sozinha quando alguém fala.">
      <Envio tipo="musica" aoEnviar={aoEnviar} rotulo="Enviar música (MP3, WAV ou OGG)" />
      <MensagemErro>{erro}</MensagemErro>

      {m && (
        <div className="flex flex-col gap-3 rounded-md bg-white/[0.04] p-3">
          <div className="flex flex-wrap gap-2">
            <BotaoAcao
              onClick={() =>
                mudar((x) =>
                  x.pausadaEm === null
                    ? { ...x, pausadaEm: Date.now() - x.inicioEm }
                    : { ...x, inicioEm: Date.now() - x.pausadaEm, pausadaEm: null },
                )
              }
            >
              {m.pausadaEm === null ? <Pause weight="fill" className="size-4" /> : <Play weight="fill" className="size-4" />}
              {m.pausadaEm === null ? "Pausar" : "Continuar"}
            </BotaoAcao>
            <BotaoAcao
              onClick={() =>
                mudar((x) => {
                  const agora = Date.now();
                  const { indice } = posicaoMusica(x, agora);
                  return posicionarMusica(x, x.faixas, (indice + 1) % x.faixas.length, 0, agora);
                })
              }
            >
              <SkipForward weight="fill" className="size-4" />
              Próxima
            </BotaoAcao>
            <BotaoAcao onClick={() => alterar((c) => ({ ...c, musica: null }))}>
              <Stop weight="fill" className="size-4" />
              Parar
            </BotaoAcao>
          </div>
          <ControleVolume
            rotulo="Volume da música"
            valor={m.volume}
            aoMudar={(volume) => mudar((x) => ({ ...x, volume }))}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-texto-suave">Baixar quando alguém fala</span>
            <div role="radiogroup" aria-label="Baixar quando alguém fala" className="grid grid-cols-3 gap-1">
              {DUCKING.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={m.ducking === d.id}
                  onClick={() => mudar((x) => ({ ...x, ducking: d.id }))}
                  className={`rounded px-2 py-1.5 text-xs font-medium ${m.ducking === d.id ? "bg-destaque/20 ring-1 ring-destaque" : "bg-white/[0.05] hover:bg-white/10"}`}
                >
                  {d.nome}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {musicas.length > 0 && (
        <ul className="flex flex-col gap-1">
          {musicas.map((a) => {
            const tocando = a.url === atual;
            return (
              <li
                key={a.id}
                className={`flex items-center gap-2 rounded-md p-1.5 text-sm ${tocando ? "bg-destaque/10 ring-1 ring-destaque/30 ring-inset" : "bg-white/[0.04]"}`}
              >
                <MusicNotes weight="fill" className={`size-4 shrink-0 ${tocando ? "text-destaque" : "text-texto-suave"}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{a.nome}</span>
                  {a.duracao && <span className="text-xs text-texto-suave tabular-nums">{formatarDuracao(a.duracao)}</span>}
                </span>
                {tocando ? (
                  <span className="px-2 text-xs font-semibold text-destaque">{m?.pausadaEm === null ? "Tocando" : "Pausada"}</span>
                ) : (
                  <button
                    type="button"
                    disabled={preparando}
                    onClick={() => void tocarDesde(a)}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-destaque hover:bg-destaque/10 disabled:opacity-50"
                  >
                    <Play weight="fill" className="size-3.5" />
                    Tocar
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Excluir ${a.nome}`}
                  onClick={() => aoExcluir(a)}
                  className="rounded p-1 text-texto-suave hover:bg-no-ar/15 hover:text-no-ar"
                >
                  <Trash weight="fill" className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Secao>
  );
}

type PropsEfeitos = { efeitos: Ativo[]; ouvindo: boolean; aoEnviar: () => void; aoExcluir: (a: Ativo) => void };

function SecaoEfeitos({ efeitos, ouvindo, aoEnviar, aoExcluir }: PropsEfeitos) {
  const room = useRoomContext();
  const [volume, setVolume] = useState(0.8);
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    try {
      const salvo = Number(localStorage.getItem(CHAVE_VOLUME_EFEITOS));
      // Preferência lida só no cliente, uma vez.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(CHAVE_VOLUME_EFEITOS) !== null && salvo >= 0 && salvo <= 1) setVolume(salvo);
    } catch {}
  }, []);

  function mudarVolume(v: number) {
    setVolume(v);
    try {
      localStorage.setItem(CHAVE_VOLUME_EFEITOS, String(v));
    } catch {}
  }

  async function disparar(a: Ativo) {
    setErro(undefined);
    const pedido = { url: a.url, volume };
    try {
      // Vai para o /stage (a live), que toca uma vez. Quem não é diretor ignora.
      await room.localParticipant.publishData(codificarEfeito(pedido), { reliable: true, topic: TOPICO_EFEITO });
      if (ouvindo) tocarEfeito(pedido);
    } catch {
      setErro("Não foi possível tocar o efeito. Verifique a conexão.");
    }
  }

  return (
    <Secao titulo="Efeitos sonoros" dica="Cada botão toca uma vez na live.">
      <Envio tipo="efeito" aoEnviar={aoEnviar} rotulo="Enviar efeito (MP3, WAV ou OGG)" />
      <ControleVolume rotulo="Volume dos efeitos" valor={volume} aoMudar={mudarVolume} imediato />
      <MensagemErro>{erro}</MensagemErro>
      {efeitos.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {efeitos.map((a) => (
            <li key={a.id} className="group relative">
              <button
                type="button"
                onClick={() => void disparar(a)}
                className="flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-md bg-white/[0.06] px-2 py-2 text-xs font-semibold ring-1 ring-white/10 ring-inset hover:bg-white/10 active:bg-destaque/25"
              >
                <SpeakerHigh weight="fill" className="size-5 text-destaque" aria-hidden />
                <span className="line-clamp-2 text-center break-all">{a.nome}</span>
              </button>
              <button
                type="button"
                aria-label={`Excluir ${a.nome}`}
                onClick={() => aoExcluir(a)}
                className="absolute top-1 right-1 rounded p-1 text-texto-suave opacity-0 group-hover:opacity-100 hover:bg-no-ar/15 hover:text-no-ar focus-visible:opacity-100"
              >
                <Trash weight="fill" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Secao>
  );
}

function BotaoAcao({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
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

/** Controle de volume 0–100%. Sem `imediato`, espera o arraste parar para mudar a cena. */
function ControleVolume({
  rotulo,
  valor,
  aoMudar,
  imediato = false,
}: {
  rotulo: string;
  valor: number;
  aoMudar: (v: number) => void;
  imediato?: boolean;
}) {
  const [local, setLocal] = useState(valor);
  const espera = useRef<number | undefined>(undefined);
  useEffect(() => {
    // Acompanha mudanças vindas da cena.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(valor);
  }, [valor]);

  return (
    <label className="flex items-center gap-3 text-xs font-semibold text-texto-suave">
      <span className="w-28 shrink-0">{rotulo}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(local * 100)}
        onChange={(e) => {
          const v = Number(e.target.value) / 100;
          setLocal(v);
          window.clearTimeout(espera.current);
          if (imediato) aoMudar(v);
          else espera.current = window.setTimeout(() => aoMudar(v), 250);
        }}
        className="flex-1 accent-destaque"
      />
      <span className="w-9 text-right tabular-nums">{Math.round(local * 100)}%</span>
    </label>
  );
}

/** Hora atual que se atualiza sozinha (a faixa tocando muda com o tempo). 0 antes de montar. */
function useRelogio(ms: number) {
  const [agora, setAgora] = useState(0);
  useEffect(() => {
    const tique = () => setAgora(Date.now());
    const primeiro = window.setTimeout(tique, 0);
    const intervalo = window.setInterval(tique, ms);
    return () => {
      window.clearTimeout(primeiro);
      window.clearInterval(intervalo);
    };
  }, [ms]);
  return agora;
}

function formatarDuracao(seg: number) {
  const s = Math.round(seg);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
