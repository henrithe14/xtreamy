"use client";

import { useCallback, useState } from "react";
import { useParticipantAttribute } from "@livekit/components-react";
import type { Participant } from "livekit-client";
import { ATRIBUTO_AUDIO_PRIVADO, ATRIBUTO_ESPELHAR } from "@/lib/participante";
import { carregarPreferencias, salvarPreferencias } from "@/lib/preferencias";

/** A pessoa está "mudo para a live"? (a equipe ouve, a live não). */
export function useMudoParaLive(participant?: Participant): boolean {
  return useParticipantAttribute(ATRIBUTO_AUDIO_PRIVADO, participant ? { participant } : undefined) === "1";
}

/** A câmera da pessoa está espelhada? (vale na tela de todos e na live). */
export function useEspelhado(participant?: Participant): boolean {
  return useParticipantAttribute(ATRIBUTO_ESPELHAR, participant ? { participant } : undefined) === "1";
}

type Campo = "audioPrivado" | "espelhar";

/** Liga/desliga um atributo pelo servidor (convidado: só em si; diretor: em todos). */
function useAlternarAtributo(campo: Campo, transmissaoId: string, codigo?: string) {
  const [pendente, setPendente] = useState<string | null>(null);
  const [erro, setErro] = useState<string>();

  const alternar = useCallback(
    async (alvo: string, valor: boolean) => {
      setPendente(alvo);
      setErro(undefined);
      try {
        const r = await fetch("/api/participante", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transmissaoId, codigo, alvo, [campo]: valor }),
        });
        if (!r.ok) setErro(((await r.json().catch(() => ({}))) as { erro?: string }).erro ?? "Não foi possível mudar.");
        return r.ok;
      } catch {
        setErro("Sem conexão com o servidor.");
        return false;
      } finally {
        setPendente(null);
      }
    },
    [campo, transmissaoId, codigo],
  );

  return { alternar, pendente, erro };
}

export function useAlternarMudoParaLive(transmissaoId: string, codigo?: string) {
  return useAlternarAtributo("audioPrivado", transmissaoId, codigo);
}

/** Espelhar a câmera. Na própria pessoa, também fica lembrado para a próxima entrada. */
export function useAlternarEspelho(transmissaoId: string, codigo?: string) {
  const base = useAlternarAtributo("espelhar", transmissaoId, codigo);
  const { alternar: alternarBase } = base;
  const alternar = useCallback(
    async (alvo: string, valor: boolean, lembrar = false) => {
      const ok = await alternarBase(alvo, valor);
      if (ok && lembrar) salvarPreferencias({ ...carregarPreferencias(), espelhar: valor });
      return ok;
    },
    [alternarBase],
  );
  return { ...base, alternar };
}
