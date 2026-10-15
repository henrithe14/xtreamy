"use client";

import { useCallback } from "react";
import { useRoomContext } from "@livekit/components-react";
import { codificarEfeito, efeitoTocando, tocarEfeito, TOPICO_EFEITO } from "@/lib/audioLive";

/** Volume geral dos efeitos, guardado no navegador de quem dirige. */
export const CHAVE_VOLUME_EFEITOS = "estudio:volume-efeitos";

export function lerVolumeEfeitos(): number {
  try {
    const bruto = localStorage.getItem(CHAVE_VOLUME_EFEITOS);
    const valor = Number(bruto);
    if (bruto !== null && valor >= 0 && valor <= 1) return valor;
  } catch {}
  return 0.8;
}

/**
 * Dispara um efeito para todos (a live e a equipe; quem não dirige é ignorado pelo /stage).
 * Disparar de novo enquanto ele toca corta o efeito.
 */
export function useDispararEfeito() {
  const room = useRoomContext();
  return useCallback(
    async (url: string, volume: number) => {
      const acao: "tocar" | "parar" = efeitoTocando(url) ? "parar" : "tocar";
      const pedido = { url, volume, acao };
      await room.localParticipant.publishData(codificarEfeito(pedido), { reliable: true, topic: TOPICO_EFEITO });
      tocarEfeito(pedido); // a própria mensagem não volta para quem envia
    },
    [room],
  );
}
