"use client";

import { useEffect } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { LocalAudioTrack } from "livekit-client";
import { criarPortaoRuido, portaoSuportado } from "@/lib/portaoRuido";

let contextoCompartilhado: AudioContext | undefined;

/**
 * Liga o portão de ruído no microfone desta pessoa: calada, não transmite nada (nem para a
 * equipe, nem para a live). Só aplica com o áudio do navegador destravado; senão o
 * microfone mandaria silêncio, então espera o primeiro toque na página.
 */
export function usePortaoRuido(ligado: boolean) {
  const { localParticipant, microphoneTrack } = useLocalParticipant();
  const faixa = microphoneTrack?.track;

  useEffect(() => {
    if (!ligado || !portaoSuportado() || !(faixa instanceof LocalAudioTrack)) return;
    let cancelado = false;
    contextoCompartilhado ??= new AudioContext({ latencyHint: "interactive" });
    const contexto = contextoCompartilhado;

    async function aplicar() {
      if (cancelado || !(faixa instanceof LocalAudioTrack) || faixa.getProcessor()) return;
      if (contexto.state !== "running") await contexto.resume().catch(() => undefined);
      if (contexto.state !== "running" || cancelado) return;
      try {
        faixa.setAudioContext(contexto);
        await faixa.setProcessor(criarPortaoRuido());
      } catch {
        // Sem portão o microfone continua normal.
      }
    }

    const aoTocar = () => void aplicar();
    // Se o navegador pausar o áudio (ex.: ligação no iPhone), o portão mandaria silêncio:
    // volta para o microfone direto até destravar de novo.
    const aoMudarEstado = () => {
      if (contexto.state !== "running" && faixa.getProcessor()?.name === "portao-ruido") void faixa.stopProcessor();
    };
    window.addEventListener("pointerdown", aoTocar);
    window.addEventListener("keydown", aoTocar);
    contexto.addEventListener("statechange", aoMudarEstado);
    void aplicar();
    return () => {
      cancelado = true;
      contexto.removeEventListener("statechange", aoMudarEstado);
      window.removeEventListener("pointerdown", aoTocar);
      window.removeEventListener("keydown", aoTocar);
      if (faixa.getProcessor()?.name === "portao-ruido") void faixa.stopProcessor();
    };
  }, [ligado, faixa, localParticipant]);
}
