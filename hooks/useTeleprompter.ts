"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDataChannel, useRoomContext } from "@livekit/components-react";
import { RoomEvent, type RemoteParticipant } from "livekit-client";
import {
  codificarTeleprompter,
  emitirLocal,
  lerMensagemTeleprompter,
  ouvirLocal,
  TOPICO_TELEPROMPTER,
  type EstadoTeleprompter,
} from "@/lib/teleprompter";
import { ATRIBUTO_DIRETOR, lerMetadados } from "@/lib/participante";

/**
 * Diretor: envia o teleprompter para as pessoas escolhidas e reenvia para quem
 * entrar de novo (recarregou a página). O /stage nunca está entre os destinos.
 */
export function useControleTeleprompter() {
  const room = useRoomContext();
  const [estado, setEstado] = useState<EstadoTeleprompter | null>(null);
  const [alvos, setAlvos] = useState<string[]>([]);
  const ultimo = useRef<{ estado: EstadoTeleprompter | null; alvos: string[] }>({ estado: null, alvos: [] });

  const publicar = useCallback(
    async (novo: EstadoTeleprompter | null, para: string[]) => {
      const local = room.localParticipant.identity;
      const remotos = para.filter((id) => id !== local);
      if (para.includes(local)) emitirLocal({ estado: novo });
      if (remotos.length > 0) {
        await room.localParticipant.publishData(codificarTeleprompter({ estado: novo }), {
          reliable: true,
          topic: TOPICO_TELEPROMPTER,
          destinationIdentities: remotos,
        });
      }
    },
    [room],
  );

  /** Envia o estado para `para` e fecha em quem saiu da lista. */
  const enviar = useCallback(
    async (novo: EstadoTeleprompter | null, para: string[]) => {
      const sairam = ultimo.current.alvos.filter((id) => !para.includes(id));
      if (sairam.length > 0) await publicar(null, sairam);
      await publicar(novo, para);
      ultimo.current = { estado: novo, alvos: novo ? para : [] };
      setEstado(novo);
      setAlvos(novo ? para : []);
    },
    [publicar],
  );

  // Quem recarregou volta a receber o texto onde ele está.
  useEffect(() => {
    const aoEntrar = (p: RemoteParticipant) => {
      const { estado: atual, alvos: para } = ultimo.current;
      if (atual && para.includes(p.identity)) void publicar(atual, [p.identity]);
    };
    room.on(RoomEvent.ParticipantConnected, aoEntrar);
    return () => {
      room.off(RoomEvent.ParticipantConnected, aoEntrar);
    };
  }, [room, publicar]);

  return { estado, alvos, enviar };
}

/** Quem recebe: o último estado vindo do diretor (dono ou delegado), ou do canal local. */
export function useTeleprompterRecebido() {
  const [estado, setEstado] = useState<EstadoTeleprompter | null>(null);

  useDataChannel(TOPICO_TELEPROMPTER, (msg) => {
    const remetente = msg.from;
    if (!remetente) return;
    const dirige = lerMetadados(remetente.metadata).papel === "host" || remetente.attributes[ATRIBUTO_DIRETOR] === "1";
    if (!dirige) return;
    const m = lerMensagemTeleprompter(msg.payload);
    if (m) setEstado(m.estado);
  });

  useEffect(() => ouvirLocal((m) => setEstado(m.estado)), []);

  return estado;
}
