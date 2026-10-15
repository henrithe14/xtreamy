"use client";

import { useCallback, useEffect, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, type RemoteParticipant } from "livekit-client";
import { codificarRecado, lerRecado, tempoNaTela, TOPICO_RECADO } from "@/lib/recado";

export type Recado = { id: string; de: string; texto: string; duracao: number };

/** Recados que chegaram para mim. Cada um sai sozinho depois do tempo de leitura. */
export function useRecadosRecebidos() {
  const room = useRoomContext();
  const [recados, setRecados] = useState<Recado[]>([]);

  useEffect(() => {
    const aoReceber = (payload: Uint8Array, participante?: RemoteParticipant, _tipo?: unknown, topico?: string) => {
      if (topico !== TOPICO_RECADO || !participante) return;
      const texto = lerRecado(payload);
      if (!texto) return;
      const recado = { id: crypto.randomUUID(), de: participante.name || "Alguém da sala", texto, duracao: tempoNaTela(texto) };
      // No máximo 4 na tela; o mais antigo sai primeiro.
      setRecados((atuais) => [...atuais.slice(-3), recado]);
    };
    room.on(RoomEvent.DataReceived, aoReceber);
    return () => {
      room.off(RoomEvent.DataReceived, aoReceber);
    };
  }, [room]);

  const fechar = useCallback((id: string) => setRecados((atuais) => atuais.filter((r) => r.id !== id)), []);
  return { recados, fechar };
}

/** Envia um recado só para as pessoas escolhidas. */
export function useEnviarRecado() {
  const room = useRoomContext();
  return useCallback(
    async (destinos: string[], texto: string) => {
      if (destinos.length === 0 || !texto.trim()) return;
      await room.localParticipant.publishData(codificarRecado(texto.trim()), {
        reliable: true,
        topic: TOPICO_RECADO,
        destinationIdentities: destinos,
      });
    },
    [room],
  );
}
