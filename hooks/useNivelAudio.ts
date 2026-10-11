"use client";

import { useEffect, useState } from "react";
import { createAudioAnalyser, type LocalAudioTrack } from "livekit-client";

/** Nível do microfone (0 a 1), atualizado ~15 vezes por segundo. */
export function useNivelAudio(faixa: LocalAudioTrack | undefined): number {
  const [nivel, setNivel] = useState(0);

  useEffect(() => {
    if (!faixa) return;
    const { calculateVolume, cleanup } = createAudioAnalyser(faixa, { cloneTrack: true });
    const intervalo = window.setInterval(() => {
      // Curva raiz: deixa a fala normal visível no medidor sem saturar.
      setNivel(Math.min(1, Math.sqrt(calculateVolume()) * 1.4));
    }, 66);

    return () => {
      window.clearInterval(intervalo);
      setNivel(0);
      void cleanup();
    };
  }, [faixa]);

  return nivel;
}
