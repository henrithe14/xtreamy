"use client";

import { useCallback, useMemo, useState } from "react";
import { usePreviewTracks } from "@livekit/components-react";
import {
  Track,
  VideoPresets,
  type CreateLocalTracksOptions,
  type LocalAudioTrack,
  type LocalVideoTrack,
} from "livekit-client";
import type { Preferencias } from "@/lib/preferencias";

export type ErroMidia = "permissao" | "sem-aparelho" | "em-uso" | "outro";

function classificarErro(e: Error): ErroMidia {
  if (e.name === "NotAllowedError" || e.name === "SecurityError") return "permissao";
  if (e.name === "NotFoundError" || e.name === "OverconstrainedError") return "sem-aparelho";
  if (e.name === "NotReadableError" || e.name === "AbortError") return "em-uso";
  return "outro";
}

/**
 * Cria as faixas locais de prévia (câmera e microfone) com o hook oficial do LiveKit.
 *
 * Os aparelhos usam o id salvo só na criação; trocar de aparelho depois é feito na
 * própria faixa (useMediaDeviceSelect), sem recriar nem pedir permissão de novo.
 * Mudar resolução, eco/ruído ou "só voz" recria as faixas.
 */
export function useFaixasPrevia(preferencias: Preferencias, ativo: boolean, idsIniciais: { camera: string; microfone: string }) {
  const [erro, setErro] = useState<ErroMidia>();

  const opcoes = useMemo<CreateLocalTracksOptions>(() => {
    if (!ativo) return { audio: false, video: false };
    return {
      audio: {
        deviceId: idsIniciais.microfone || undefined,
        echoCancellation: preferencias.cancelamentoEco,
        noiseSuppression: preferencias.reducaoRuido,
        autoGainControl: true,
      },
      video: preferencias.soVoz
        ? false
        : {
            deviceId: idsIniciais.camera || undefined,
            resolution: VideoPresets[preferencias.resolucao].resolution,
          },
    };
  }, [
    ativo,
    idsIniciais.camera,
    idsIniciais.microfone,
    preferencias.cancelamentoEco,
    preferencias.reducaoRuido,
    preferencias.soVoz,
    preferencias.resolucao,
  ]);

  const aoErrar = useCallback((e: Error) => setErro(classificarErro(e)), []);
  const faixas = usePreviewTracks(opcoes, aoErrar);

  const video = faixas?.find((f): f is LocalVideoTrack => f.kind === Track.Kind.Video);
  const audio = faixas?.find((f): f is LocalAudioTrack => f.kind === Track.Kind.Audio);

  const limparErro = useCallback(() => setErro(undefined), []);

  return { video: preferencias.soVoz ? undefined : video, audio, erro, limparErro };
}
