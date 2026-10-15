"use client";

import { useState, useTransition } from "react";
import {
  useIsMuted,
  useIsSpeaking,
  useParticipantAttribute,
  useParticipantInfo,
  useParticipants,
  useTracks,
  VideoTrack,
  type TrackReference,
} from "@livekit/components-react";
import { Track, type Participant } from "livekit-client";
import { ArrowLineUp, Crown, Eye, EyeSlash, FlipHorizontal, Headset, MicrophoneSlash, PencilSimple, SpeakerSimpleSlash, Star, UserMinus } from "@phosphor-icons/react";
import { useEspelhado, useMudoParaLive } from "@/hooks/useAudioPrivado";
import type { ControlePonto } from "@/hooks/usePonto";
import type { Cena } from "@/lib/cena";
import { obterLayout } from "@/lib/layouts";
import { ATRIBUTO_DIRETOR, ehPonto, lerMetadados } from "@/lib/participante";
import { removerParticipante } from "@/lib/acoes/sala";
import { CartaoSoVoz } from "@/components/ui/CartaoSoVoz";

/** Ações do diretor que valem para qualquer pessoa: mudo para a live e ponto. */
export type ControlesPessoa = {
  alternarMudo: (identity: string, mudo: boolean) => void;
  mudoPendente: string | null;
  /** Câmera espelhada (na tela e na live). */
  alternarEspelho: (identity: string, espelhar: boolean) => void;
  espelhoPendente: string | null;
  /** Só o dono tem ponto (conexão separada com a conta dele). */
  ponto: ControlePonto | null;
  /** Só o dono passa a direção a um convidado (diretor delegado). */
  alternarDirecao: ((identity: string, diretor: boolean) => void) | null;
  /** Código do convite do diretor delegado (as ações do servidor conferem a direção). */
  codigo?: string;
  /** Identities com o nome escondido na live. */
  etiquetasOcultas: string[];
  alternarEtiqueta: (identity: string) => void;
  editarEtiqueta: (identity: string, etiqueta: string) => Promise<void>;
};

type Props = {
  cena: Cena;
  transmissaoId: string;
  alterar: (mudanca: (atual: Cena) => Omit<Cena, "versao">) => void;
  controles: ControlesPessoa;
};

/** Pessoas na sala, separadas em No palco (na ordem dos slots) e Bastidor. */
export function PainelPessoas({ cena, transmissaoId, alterar, controles }: Props) {
  // A conexão do ponto não é uma pessoa: fica fora da lista.
  const participantes = useParticipants().filter((p) => !ehPonto(p.identity));
  const cameras = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const porIdentity = new Map(participantes.map((p) => [p.identity, p]));
  const maxPessoas = obterLayout(cena.layoutId).maxPessoas;

  const palco = cena.noPalco;
  const bastidor = participantes.filter((p) => !palco.includes(p.identity));
  const camera = (p: Participant) => cameras.find((c) => c.participant.identity === p.identity);

  const porNoPalco = (id: string) => alterar((c) => ({ ...c, noPalco: [...c.noPalco, id] }));
  const tirarDoPalco = (id: string) => alterar((c) => ({ ...c, noPalco: c.noPalco.filter((x) => x !== id) }));
  const destacar = (id: string) => alterar((c) => ({ ...c, noPalco: [id, ...c.noPalco.filter((x) => x !== id)] }));

  return (
    <section
      aria-label="Pessoas"
      className="vidro flex flex-col gap-5 rounded-xl p-3 sm:p-4 deitado:max-h-[calc(100dvh-7.5rem)] deitado:overflow-y-auto"
    >
      <Grupo titulo="No palco" contagem={palco.length} vazio="Ninguém no palco ainda.">
        {palco.map((id, i) => {
          const p = porIdentity.get(id);
          if (!p) {
            return (
              <li
                key={id}
                className="flex flex-col justify-between gap-2 rounded-lg bg-white/[0.03] p-2 text-sm text-texto-suave ring-1 ring-white/[0.06]"
              >
                <span className="flex aspect-video items-center justify-center rounded-md bg-black/20 text-xs">Saiu da sala</span>
                <BotaoAcao onClick={() => tirarDoPalco(id)}>Tirar</BotaoAcao>
              </li>
            );
          }
          return (
            <ItemPessoa
              key={id}
              participante={p}
              camera={camera(p)}
              transmissaoId={transmissaoId}
              controles={controles}
              foraDaLive={i >= maxPessoas}
              acoes={
                <>
                  {i > 0 && (
                    <BotaoAcao onClick={() => destacar(id)} rotulo="Primeiro lugar no layout">
                      <Star weight="bold" />
                    </BotaoAcao>
                  )}
                  <BotaoAcao onClick={() => tirarDoPalco(id)}>Tirar</BotaoAcao>
                </>
              }
            />
          );
        })}
      </Grupo>

      <Grupo titulo="Bastidor" contagem={bastidor.length} vazio="Ninguém no bastidor. Convide pessoas pelo botão Convidar.">
        {bastidor.map((p) => {
          const soDiretor = lerMetadados(p.metadata).soDiretor;
          return (
            <ItemPessoa
              key={p.identity}
              participante={p}
              camera={camera(p)}
              transmissaoId={transmissaoId}
              controles={controles}
              acoes={
                soDiretor ? (
                  <span className="text-xs text-texto-suave">Fora da live</span>
                ) : (
                  <BotaoAcao destaque onClick={() => porNoPalco(p.identity)} desativado={palco.length >= 10}>
                    <ArrowLineUp weight="bold" />
                    Palco
                  </BotaoAcao>
                )
              }
            />
          );
        })}
      </Grupo>
    </section>
  );
}

function Grupo({ titulo, contagem, vazio, children }: { titulo: string; contagem: number; vazio: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        {titulo}
        <span className="rounded-full bg-white/[0.08] px-2 text-xs text-texto-suave">{contagem}</span>
      </h2>
      {contagem === 0 ? (
        <p className="text-sm text-texto-suave">{vazio}</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-2">{children}</ul>
      )}
    </div>
  );
}

type PropsItem = {
  participante: Participant;
  camera?: TrackReference;
  transmissaoId: string;
  acoes: React.ReactNode;
  controles: ControlesPessoa;
  /** No palco, mas o layout atual não tem lugar para esta pessoa. */
  foraDaLive?: boolean;
};

function ItemPessoa({ participante, camera, transmissaoId, acoes, controles, foraDaLive }: PropsItem) {
  const { name, identity, metadata } = useParticipantInfo({ participant: participante });
  const { etiqueta, papel, soDiretor } = lerMetadados(metadata);
  const falando = useIsSpeaking(participante);
  const micMudo = useIsMuted({ participant: participante, source: Track.Source.Microphone });
  const comVideo = camera !== undefined && !camera.publication.isMuted;
  const nome = name || "Participante";
  const local = participante.isLocal;
  const mudoParaLive = useMudoParaLive(participante);
  const espelhado = useEspelhado(participante);
  const { ponto } = controles;
  const pontoNestaPessoa = ponto?.alvo === identity;
  const delegado = useParticipantAttribute(ATRIBUTO_DIRETOR, { participant: participante }) === "1";
  const etiquetaOculta = identity ? controles.etiquetasOcultas.includes(identity) : false;
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState("");

  return (
    <li className="flex flex-col gap-2 rounded-lg bg-white/[0.03] p-2 ring-1 ring-white/[0.06]">
      <div
        className={`relative aspect-video w-full overflow-hidden rounded-md bg-superficie-2 outline-2 -outline-offset-2 transition-[outline-color] ${
          falando ? "outline-pronto" : "outline-transparent"
        }`}
      >
        {comVideo ? (
          // Igual à live: espelhado só se a pessoa (ou o diretor) escolheu espelhar.
          <VideoTrack trackRef={camera} className={`size-full object-cover ${espelhado ? "-scale-x-100" : ""}`} />
        ) : (
          <CartaoSoVoz nome={nome} falando={false} className="absolute inset-0" />
        )}
        {mudoParaLive && (
          <span className="absolute top-1 left-1 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[0.7rem] font-semibold text-ensaio backdrop-blur-sm">
            <SpeakerSimpleSlash weight="bold" className="size-3.5" aria-hidden />
            Mudo para a live
          </span>
        )}
        {!local && identity && (
          <div className="absolute top-1 right-1">
            <BotaoRemover transmissaoId={transmissaoId} codigo={controles.codigo} identity={identity} nome={nome} />
          </div>
        )}
      </div>
      <div className="min-w-0 px-0.5">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
          {micMudo && <MicrophoneSlash weight="bold" className="size-3.5 shrink-0 text-no-ar" aria-label="Microfone desligado" />}
          <span className="truncate">
            {nome}
            {local && <span className="font-normal text-texto-suave"> (você)</span>}
          </span>
        </p>
        {editando && identity ? (
          <form
            className="mt-1 flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              void controles.editarEtiqueta(identity, rascunho).then(() => setEditando(false));
            }}
          >
            <label htmlFor={`etq-${identity}`} className="sr-only">
              Etiqueta de {nome}
            </label>
            <input
              id={`etq-${identity}`}
              autoFocus
              value={rascunho}
              maxLength={40}
              onChange={(e) => setRascunho(e.target.value)}
              placeholder="Ex.: Comentarista"
              className="min-h-8 min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 text-xs focus:border-destaque focus:outline-none"
            />
            <button type="submit" className="rounded bg-destaque px-2 text-xs font-semibold text-destaque-texto">
              OK
            </button>
          </form>
        ) : (
        <p className="flex items-center gap-1 truncate text-xs text-texto-suave">
          {foraDaLive
            ? "Não cabe no layout atual"
            : papel === "host"
              ? soDiretor
                ? "Diretor, fora da live"
                : "Diretor"
              : delegado
                ? "Diretor convidado"
                : etiqueta || "Convidado"}
          {identity && (
            <>
              <button
                type="button"
                onClick={() => {
                  setRascunho(etiqueta);
                  setEditando(true);
                }}
                aria-label={`Editar etiqueta de ${nome}`}
                title="Editar etiqueta"
                className="rounded p-0.5 hover:bg-white/10 hover:text-texto"
              >
                <PencilSimple weight="bold" className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => controles.alternarEtiqueta(identity)}
                aria-pressed={etiquetaOculta}
                aria-label={etiquetaOculta ? `Mostrar o nome de ${nome} na live` : `Esconder o nome de ${nome} na live`}
                title={etiquetaOculta ? "Nome escondido na live" : "Esconder o nome na live"}
                className={`rounded p-0.5 hover:bg-white/10 ${etiquetaOculta ? "text-ensaio" : "hover:text-texto"}`}
              >
                {etiquetaOculta ? <EyeSlash weight="bold" className="size-3.5" /> : <Eye weight="bold" className="size-3.5" />}
              </button>
            </>
          )}
        </p>
        )}
      </div>
      {/* Quebra em mais linhas quando o cartão é estreito: nada passa da largura da câmera. */}
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <BotaoAcao
          onClick={() => identity && controles.alternarMudo(identity, !mudoParaLive)}
          ativo={mudoParaLive}
          desativado={controles.mudoPendente === identity}
          rotulo={mudoParaLive ? "Voltar a ser ouvido na live" : "Mudo para a live (a equipe continua ouvindo)"}
        >
          <SpeakerSimpleSlash weight="bold" />
        </BotaoAcao>
        {comVideo && (
          <BotaoAcao
            onClick={() => identity && controles.alternarEspelho(identity, !espelhado)}
            ativo={espelhado}
            desativado={controles.espelhoPendente === identity}
            rotulo={espelhado ? "Desespelhar a câmera (também na live)" : "Espelhar a câmera (também na live)"}
          >
            <FlipHorizontal weight="bold" />
          </BotaoAcao>
        )}
        {controles.alternarDirecao && papel === "convidado" && identity && (
          <BotaoAcao
            onClick={() => controles.alternarDirecao?.(identity, !delegado)}
            ativo={delegado}
            rotulo={delegado ? "Tirar a direção desta pessoa" : "Passar a direção para esta pessoa (ela controla o estúdio com você)"}
          >
            <Crown weight="bold" />
          </BotaoAcao>
        )}
        {ponto && !local && identity && (
          <BotaoAcao
            onClick={() => void (pontoNestaPessoa ? ponto.desligar() : ponto.falarCom(identity))}
            ativo={pontoNestaPessoa}
            desativado={ponto.conectando}
            rotulo={pontoNestaPessoa ? "Desligar o ponto" : "Falar só com esta pessoa (ponto)"}
          >
            <Headset weight="bold" />
          </BotaoAcao>
        )}
        <div className="flex min-w-[6.5rem] flex-1 items-center gap-1 [&>*:last-child]:flex-1">{acoes}</div>
      </div>
    </li>
  );
}

type PropsBotaoAcao = {
  onClick: () => void;
  children: React.ReactNode;
  rotulo?: string;
  destaque?: boolean;
  /** Para liga/desliga: realça quando ligado. */
  ativo?: boolean;
  desativado?: boolean;
};

function BotaoAcao({ onClick, children, rotulo, destaque, ativo, desativado }: PropsBotaoAcao) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      aria-pressed={ativo}
      disabled={desativado}
      className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors disabled:opacity-40 [&_svg]:size-4 ${
        destaque
          ? "bg-destaque text-destaque-texto hover:bg-destaque-forte"
          : ativo
            ? "bg-ensaio/20 text-ensaio ring-1 ring-ensaio/40 ring-inset hover:bg-ensaio/30"
            : "bg-white/[0.06] text-texto ring-1 ring-white/10 ring-inset hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

type PropsRemover = { transmissaoId: string; codigo?: string; identity: string; nome: string };

function BotaoRemover({ transmissaoId, codigo, identity, nome }: PropsRemover) {
  const [confirmando, setConfirmando] = useState(false);
  const [removendo, iniciar] = useTransition();
  const [erro, setErro] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        aria-label={`Remover ${nome} da sala`}
        title="Remover da sala"
        className="rounded-md bg-black/50 p-1.5 text-white/80 backdrop-blur-sm hover:bg-no-ar hover:text-white"
      >
        <UserMinus weight="bold" className="size-4" />
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1 rounded-md bg-black/70 p-1 backdrop-blur-sm">
      <button
        type="button"
        disabled={removendo}
        onClick={() =>
          iniciar(async () => {
            const r = await removerParticipante(transmissaoId, identity, codigo);
            if (r.erro) setErro(true);
          })
        }
        className="rounded-md bg-no-ar/15 px-2 py-1.5 text-xs font-semibold text-no-ar hover:bg-no-ar/25"
      >
        {removendo ? "Removendo…" : erro ? "Tentar de novo" : "Remover"}
      </button>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="rounded-md px-2 py-1.5 text-xs text-white/80 hover:bg-white/10"
      >
        Cancelar
      </button>
    </span>
  );
}
