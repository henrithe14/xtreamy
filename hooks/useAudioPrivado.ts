"use client";

import { useCallback, useState } from "react";
import { useParticipantAttribute } from "@livekit/components-react";
import type { Participant } from "livekit-client";
import { ATRIBUTO_AUDIO_PRIVADO } from "@/lib/participante";

/** A pessoa está "mudo para a live"? (a equipe ouve, a live não). */
export function useMudoParaLive(participant?: Participant): boolean {
  return useParticipantAttribute(ATRIBUTO_AUDIO_PRIVADO, participant ? { participant } : undefined) === "1";
}

/** Liga/desliga "mudo para a live" pelo servidor (convidado: só em si; diretor: em todos). */
export function useAlternarMudoParaLive(transmissaoId: string, codigo?: string) {
  const [pendente, setPendente] = useState<string | null>(null);
  const [erro, setErro] = useState<string>();

  const alternar = useCallback(
    async (alvo: string, mudo: boolean) => {
      setPendente(alvo);
      setErro(undefined);
      try {
        const r = await fetch("/api/participante", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transmissaoId, codigo, alvo, audioPrivado: mudo }),
        });
        if (!r.ok) setErro(((await r.json().catch(() => ({}))) as { erro?: string }).erro ?? "Não foi possível mudar.");
      } catch {
        setErro("Sem conexão com o servidor.");
      } finally {
        setPendente(null);
      }
    },
    [transmissaoId, codigo],
  );

  return { alternar, pendente, erro };
}
