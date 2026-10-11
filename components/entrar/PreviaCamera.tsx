"use client";

import { useEffect, useRef } from "react";
import type { LocalVideoTrack } from "livekit-client";
import { CartaoSoVoz } from "@/components/ui/CartaoSoVoz";

type Props = {
  video: LocalVideoTrack | undefined;
  carregando: boolean;
  nome: string;
  etiqueta: string;
  falando: boolean;
};

/**
 * Prévia 16:9 da própria câmera. O espelhamento é só aqui (CSS): quem assiste vê
 * a imagem normal. Por cima, a etiqueta como vai aparecer na live.
 */
export function PreviaCamera({ video, carregando, nome, etiqueta, falando }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || !video) return;
    video.attach(elemento);
    return () => {
      video.detach(elemento);
    };
  }, [video]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-superficie-2 ring-1 ring-white/10">
      {video ? (
        <video ref={ref} muted playsInline autoPlay className="size-full -scale-x-100 object-cover" />
      ) : (
        <CartaoSoVoz nome={nome} falando={falando} className="absolute inset-0" />
      )}

      {carregando && (
        <p className="absolute inset-0 flex items-center justify-center bg-superficie-2 text-texto-suave">
          Ligando câmera e microfone…
        </p>
      )}

      {nome && (
        <div className="absolute bottom-[6%] left-[4%] max-w-[80%] rounded-md bg-black/45 px-3 py-1.5 ring-1 ring-white/10 backdrop-blur-md">
          <p className="truncate font-semibold leading-tight">{nome}</p>
          {etiqueta && <p className="truncate text-sm leading-tight text-texto-suave">{etiqueta}</p>}
        </div>
      )}
    </div>
  );
}
