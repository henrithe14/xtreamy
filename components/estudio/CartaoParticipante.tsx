"use client";

import { useState, useTransition } from "react";
import { useIsMuted, useIsSpeaking, useParticipantInfo, VideoTrack } from "@livekit/components-react";
import type { TrackReference, TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Track } from "livekit-client";
import { MicrophoneSlash, UserMinus } from "@phosphor-icons/react";
import { lerMetadados } from "@/lib/participante";
import { removerParticipante } from "@/lib/acoes/sala";
import { CartaoSoVoz } from "@/components/ui/CartaoSoVoz";

type Props = {
  trackRef: TrackReferenceOrPlaceholder;
  transmissaoId: string;
  souHost: boolean;
};

function temVideo(ref: TrackReferenceOrPlaceholder): ref is TrackReference {
  return ref.publication !== undefined && !ref.publication.isMuted;
}

export function CartaoParticipante({ trackRef, transmissaoId, souHost }: Props) {
  const { participant } = trackRef;
  const { name, identity, metadata } = useParticipantInfo({ participant });
  const { etiqueta, papel, soDiretor } = lerMetadados(metadata);
  const falando = useIsSpeaking(participant);
  const micMudo = useIsMuted({ participant, source: Track.Source.Microphone });
  const local = participant.isLocal;
  const nome = name || "Participante";

  return (
    <div
      className={`relative aspect-video overflow-hidden rounded-xl bg-superficie-2 ring-1 ring-white/10 outline-2 -outline-offset-2 transition-[outline-color] ${
        falando ? "outline-pronto" : "outline-transparent"
      }`}
    >
      {temVideo(trackRef) ? (
        <VideoTrack trackRef={trackRef} className={`size-full object-cover ${local ? "-scale-x-100" : ""}`} />
      ) : (
        <CartaoSoVoz nome={nome} falando={falando} className="absolute inset-0" />
      )}

      <div className="absolute inset-x-2 bottom-2 flex items-end justify-between gap-2">
        <div className="min-w-0 rounded-md bg-black/45 px-2.5 py-1 ring-1 ring-white/10 backdrop-blur-md">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold leading-tight">
            {micMudo && <MicrophoneSlash weight="fill" className="size-4 shrink-0 text-no-ar" aria-label="Microfone desligado" />}
            <span className="truncate">
              {nome}
              {local && <span className="font-normal text-texto-suave"> (você)</span>}
            </span>
          </p>
          {(etiqueta || papel === "host") && (
            <p className="truncate text-xs leading-tight text-texto-suave">
              {papel === "host" ? (soDiretor ? "Diretor (fora da live)" : "Diretor") : etiqueta}
              {papel === "host" && etiqueta ? `, ${etiqueta}` : ""}
            </p>
          )}
        </div>
        {souHost && !local && identity && (
          <BotaoRemover transmissaoId={transmissaoId} identity={identity} nome={nome} />
        )}
      </div>
    </div>
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
        className="rounded-md bg-black/45 p-2 text-texto-suave ring-1 ring-white/10 backdrop-blur-md hover:text-no-ar"
      >
        <UserMinus weight="fill" className="size-5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-md bg-black/60 p-1 text-sm ring-1 ring-white/10 backdrop-blur-md">
      <button
        type="button"
        disabled={removendo}
        onClick={() =>
          iniciar(async () => {
            const r = await removerParticipante(transmissaoId, identity);
            if (r.erro) setErro(true);
          })
        }
        className="rounded px-2 py-1 font-semibold text-no-ar hover:bg-no-ar/15"
      >
        {removendo ? "Removendo…" : erro ? "Tentar de novo" : "Remover"}
      </button>
      <button type="button" onClick={() => setConfirmando(false)} className="rounded px-2 py-1 text-texto-suave hover:bg-white/[0.06]">
        Cancelar
      </button>
    </div>
  );
}
