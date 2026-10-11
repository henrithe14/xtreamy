"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Room, Track } from "livekit-client";

export type EstadoPonto = { alvo: string | null; conectando: boolean; erro?: string };

/**
 * Ponto do diretor: uma segunda conexão, só de envio, cuja voz apenas o participante
 * escolhido tem permissão de ouvir (setTrackSubscriptionPermissions). O /stage e o
 * resto da sala não conseguem assinar essa faixa. Enquanto o ponto está ligado, o
 * microfone normal do diretor fica mudo, para a voz não vazar para a sala ou a live.
 */
export function usePonto(transmissaoId: string) {
  const { localParticipant } = useLocalParticipant();
  const sala = useRef<Room | null>(null);
  const micAntes = useRef(false);
  const [estado, setEstado] = useState<EstadoPonto>({ alvo: null, conectando: false });

  const desligar = useCallback(async () => {
    const atual = sala.current;
    sala.current = null;
    setEstado({ alvo: null, conectando: false });
    if (atual) {
      await atual.disconnect();
      if (micAntes.current) await localParticipant.setMicrophoneEnabled(true);
    }
  }, [localParticipant]);

  const falarCom = useCallback(
    async (alvo: string) => {
      setEstado({ alvo, conectando: true });
      try {
        if (!sala.current) {
          const r = await fetch("/api/token/ponto", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transmissaoId }),
          });
          const dados = (await r.json()) as { token?: string; erro?: string };
          const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
          if (!dados.token || !url) throw new Error(dados.erro ?? "Não foi possível ligar o ponto.");

          const room = new Room();
          await room.connect(url, dados.token, { autoSubscribe: false });
          // Permissão ANTES de publicar: em nenhum instante outra pessoa pode ouvir.
          room.localParticipant.setTrackSubscriptionPermissions(false, [{ participantIdentity: alvo, allowAll: true }]);

          micAntes.current = localParticipant.isMicrophoneEnabled;
          await localParticipant.setMicrophoneEnabled(false);
          const microfone = await localParticipant
            .getTrackPublication(Track.Source.Microphone)
            ?.track?.getDeviceId(false)
            .catch(() => undefined);
          await room.localParticipant.setMicrophoneEnabled(true, { deviceId: microfone, echoCancellation: true });
          sala.current = room;
        } else {
          sala.current.localParticipant.setTrackSubscriptionPermissions(false, [
            { participantIdentity: alvo, allowAll: true },
          ]);
        }
        setEstado({ alvo, conectando: false });
      } catch (e) {
        await desligar();
        setEstado({ alvo: null, conectando: false, erro: e instanceof Error ? e.message : "O ponto falhou." });
      }
    },
    [transmissaoId, localParticipant, desligar],
  );

  // Fechar o estúdio fecha o ponto.
  useEffect(
    () => () => {
      void sala.current?.disconnect();
    },
    [],
  );

  return { ...estado, falarCom, desligar };
}

export type ControlePonto = ReturnType<typeof usePonto>;
