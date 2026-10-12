"use client";

import { useEffect, useRef } from "react";
import { useRoomContext, useTracks, VideoTrack } from "@livekit/components-react";
import {
  RoomEvent,
  Track,
  type LocalTrackPublication,
  type RemoteParticipant,
  type RemoteTrackPublication,
} from "livekit-client";
import { Monitor } from "@phosphor-icons/react";
import type { Cena } from "@/lib/cena";
import { LAYOUT_APRESENTACAO, LAYOUT_PADRAO, obterLayout } from "@/lib/layouts";
import { ehPonto } from "@/lib/participante";

type Alterar = (mudanca: (atual: Cena) => Omit<Cena, "versao">) => void;

/** Põe a tela de alguém no ar (troca para o layout de apresentação se o atual não tiver lugar). */
function comTela(c: Cena, identity: string): Cena {
  return { ...c, apresentacaoId: identity, layoutId: obterLayout(c.layoutId).apresentacao ? c.layoutId : LAYOUT_APRESENTACAO };
}

/** Tira a tela do ar (e sai do layout de apresentação). */
function semTela(c: Cena): Cena {
  return { ...c, apresentacaoId: null, layoutId: obterLayout(c.layoutId).apresentacao ? LAYOUT_PADRAO : c.layoutId };
}

/**
 * Diretor: quem está compartilhando a tela. Compartilhar não põe no ar; o diretor
 * escolhe "Mostrar na live". Se quem está no ar para de compartilhar, a tela sai da cena.
 */
export function TelasCompartilhadas({ cena, alterar }: { cena: Cena; alterar: Alterar }) {
  const room = useRoomContext();
  const telas = useTracks([Track.Source.ScreenShare], { onlySubscribed: false }).filter((t) => !ehPonto(t.participant.identity));

  const noAr = useRef(cena.apresentacaoId);
  useEffect(() => {
    noAr.current = cena.apresentacaoId;
  }, [cena.apresentacaoId]);

  // Por evento (e não pela lista de telas), para não tirar do ar enquanto a sala ainda carrega.
  useEffect(() => {
    const tirar = (identity: string) => {
      if (identity === noAr.current) alterar((c) => (c.apresentacaoId === identity ? semTela(c) : c));
    };
    const aoDespublicar = (pub: RemoteTrackPublication, p: RemoteParticipant) => {
      if (pub.source === Track.Source.ScreenShare) tirar(p.identity);
    };
    const aoDespublicarLocal = (pub: LocalTrackPublication) => {
      if (pub.source === Track.Source.ScreenShare) tirar(room.localParticipant.identity);
    };
    const aoSair = (p: RemoteParticipant) => tirar(p.identity);
    room.on(RoomEvent.TrackUnpublished, aoDespublicar);
    room.on(RoomEvent.LocalTrackUnpublished, aoDespublicarLocal);
    room.on(RoomEvent.ParticipantDisconnected, aoSair);
    return () => {
      room.off(RoomEvent.TrackUnpublished, aoDespublicar);
      room.off(RoomEvent.LocalTrackUnpublished, aoDespublicarLocal);
      room.off(RoomEvent.ParticipantDisconnected, aoSair);
    };
  }, [room, alterar]);

  if (telas.length === 0) return null;

  return (
    <section aria-labelledby="titulo-telas" className="vidro flex flex-col gap-3 rounded-xl p-3 sm:p-4">
      <h2 id="titulo-telas" className="flex items-center gap-2 text-sm font-semibold">
        <Monitor weight="fill" className="size-4 text-destaque" aria-hidden />
        Telas compartilhadas
      </h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))] gap-2">
        {telas.map((t) => {
          const identity = t.participant.identity;
          const noArAgora = cena.apresentacaoId === identity;
          const nome = t.participant.isLocal ? "Você" : t.participant.name || "Participante";
          return (
            <li
              key={identity}
              className={`flex flex-col gap-2 rounded-lg p-2 ${noArAgora ? "bg-destaque/10 ring-1 ring-destaque/40 ring-inset" : "bg-white/[0.03] ring-1 ring-white/[0.06]"}`}
            >
              <div className="aspect-video overflow-hidden rounded-md bg-black">
                <VideoTrack trackRef={t} className="size-full object-contain" />
              </div>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{nome}</span>
                <button
                  type="button"
                  onClick={() => alterar((c) => (noArAgora ? semTela(c) : comTela(c, identity)))}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                    noArAgora
                      ? "bg-white/[0.06] text-texto ring-1 ring-white/10 ring-inset hover:bg-white/10"
                      : "bg-destaque text-destaque-texto hover:bg-destaque-forte"
                  }`}
                >
                  {noArAgora ? "Tirar da live" : "Mostrar na live"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
