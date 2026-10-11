"use client";

import { useState, useTransition } from "react";
import {
  useIsMuted,
  useIsSpeaking,
  useParticipantInfo,
  useParticipants,
  useTracks,
  VideoTrack,
  type TrackReference,
} from "@livekit/components-react";
import { Track, type Participant } from "livekit-client";
import { ArrowLineUp, MicrophoneSlash, Star, UserMinus } from "@phosphor-icons/react";
import type { Cena } from "@/lib/cena";
import { obterLayout } from "@/lib/layouts";
import { lerMetadados } from "@/lib/participante";
import { removerParticipante } from "@/lib/acoes/sala";
import { CartaoSoVoz } from "@/components/ui/CartaoSoVoz";

type Props = {
  cena: Cena;
  transmissaoId: string;
  alterar: (mudanca: (atual: Cena) => Omit<Cena, "versao">) => void;
};

/** Pessoas na sala, separadas em No palco (na ordem dos slots) e Bastidor. */
export function PainelPessoas({ cena, transmissaoId, alterar }: Props) {
  const participantes = useParticipants();
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
    <section aria-label="Pessoas" className="vidro flex flex-col gap-5 rounded-xl p-4">
      <Grupo titulo="No palco" contagem={palco.length} vazio="Ninguém no palco ainda.">
        {palco.map((id, i) => {
          const p = porIdentity.get(id);
          if (!p) {
            return (
              <li key={id} className="flex items-center justify-between gap-2 rounded-md bg-white/[0.03] px-3 py-2 text-sm text-texto-suave">
                Saiu da sala
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
              foraDaLive={i >= maxPessoas}
              acoes={
                <>
                  {i > 0 && (
                    <BotaoAcao onClick={() => destacar(id)} rotulo="Primeiro lugar no layout">
                      <Star weight="fill" />
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
      {contagem === 0 ? <p className="text-sm text-texto-suave">{vazio}</p> : <ul className="flex flex-col gap-2">{children}</ul>}
    </div>
  );
}

type PropsItem = {
  participante: Participant;
  camera?: TrackReference;
  transmissaoId: string;
  acoes: React.ReactNode;
  /** No palco, mas o layout atual não tem lugar para esta pessoa. */
  foraDaLive?: boolean;
};

function ItemPessoa({ participante, camera, transmissaoId, acoes, foraDaLive }: PropsItem) {
  const { name, identity, metadata } = useParticipantInfo({ participant: participante });
  const { etiqueta, papel, soDiretor } = lerMetadados(metadata);
  const falando = useIsSpeaking(participante);
  const micMudo = useIsMuted({ participant: participante, source: Track.Source.Microphone });
  const comVideo = camera !== undefined && !camera.publication.isMuted;
  const nome = name || "Participante";
  const local = participante.isLocal;

  return (
    <li className="flex items-center gap-3 rounded-md bg-white/[0.03] p-2 ring-1 ring-white/[0.06]">
      <div
        className={`relative aspect-video w-24 shrink-0 overflow-hidden rounded bg-superficie-2 outline-2 transition-[outline-color] ${
          falando ? "outline-pronto" : "outline-transparent"
        }`}
      >
        {comVideo ? (
          <VideoTrack trackRef={camera} className={`size-full object-cover ${local ? "-scale-x-100" : ""}`} />
        ) : (
          <CartaoSoVoz nome={nome} falando={false} className="absolute inset-0" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
          {micMudo && <MicrophoneSlash weight="fill" className="size-3.5 shrink-0 text-no-ar" aria-label="Microfone desligado" />}
          <span className="truncate">
            {nome}
            {local && <span className="font-normal text-texto-suave"> (você)</span>}
          </span>
        </p>
        <p className="truncate text-xs text-texto-suave">
          {foraDaLive
            ? "Não cabe no layout atual"
            : papel === "host"
              ? soDiretor
                ? "Diretor, fora da live"
                : "Diretor"
              : etiqueta || "Convidado"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {acoes}
        {!local && identity && <BotaoRemover transmissaoId={transmissaoId} identity={identity} nome={nome} />}
      </div>
    </li>
  );
}

type PropsBotaoAcao = {
  onClick: () => void;
  children: React.ReactNode;
  rotulo?: string;
  destaque?: boolean;
  desativado?: boolean;
};

function BotaoAcao({ onClick, children, rotulo, destaque, desativado }: PropsBotaoAcao) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      disabled={desativado}
      className={`inline-flex min-h-9 items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-colors disabled:opacity-40 [&_svg]:size-4 ${
        destaque
          ? "bg-destaque text-destaque-texto hover:bg-destaque-forte"
          : "bg-white/[0.06] text-texto ring-1 ring-white/10 ring-inset hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function BotaoRemover({ transmissaoId, identity, nome }: { transmissaoId: string; identity: string; nome: string }) {
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
        className="rounded-md p-2 text-texto-suave hover:bg-no-ar/15 hover:text-no-ar"
      >
        <UserMinus weight="fill" className="size-4" />
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        disabled={removendo}
        onClick={() =>
          iniciar(async () => {
            const r = await removerParticipante(transmissaoId, identity);
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
        className="rounded-md px-2 py-1.5 text-xs text-texto-suave hover:bg-white/[0.06]"
      >
        Cancelar
      </button>
    </span>
  );
}
