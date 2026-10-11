"use client";

import { useEffect, useRef, useState } from "react";
import type { Fundo, Logo, Midia, Vinheta } from "@/lib/cena";

/**
 * Leva o vídeo ao ponto certo: o tempo desde `inicioEm` (horário gravado na cena).
 * Assim a prévia e a live mostram o mesmo trecho, e quem entra depois não recomeça.
 */
function useVideoSincronizado(inicioEm: number, loop: boolean, comSom: boolean, aoTerminar?: () => void) {
  const ref = useRef<HTMLVideoElement>(null);
  const [terminou, setTerminou] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const posicionar = () => {
      const decorrido = (Date.now() - inicioEm) / 1000;
      const duracao = video.duration;
      if (Number.isFinite(duracao) && duracao > 0) {
        if (loop) video.currentTime = decorrido % duracao;
        else if (decorrido >= duracao) {
          setTerminou(true);
          return;
        } else video.currentTime = Math.max(0, decorrido);
      }
      video.muted = !comSom;
      // Sem permissão para tocar com som (aba comum): toca mudo em vez de travar.
      void video.play().catch(() => {
        video.muted = true;
        void video.play().catch(() => undefined);
      });
    };

    if (video.readyState >= 1) posicionar();
    else video.addEventListener("loadedmetadata", posicionar, { once: true });
    return () => video.removeEventListener("loadedmetadata", posicionar);
  }, [inicioEm, loop, comSom]);

  const aoAcabar = () => {
    setTerminou(true);
    aoTerminar?.();
  };

  return { ref, terminou, aoAcabar };
}

/** Plano de fundo enviado (cor, imagem ou vídeo em loop). */
export function FundoEnviado({ fundo }: { fundo: Fundo }) {
  if (fundo.tipo === "cor") return <div aria-hidden className="absolute inset-0" style={{ background: fundo.valor }} />;
  if (fundo.tipo === "imagem")
    // eslint-disable-next-line @next/next/no-img-element -- arquivo do próprio usuário no Storage
    return <img aria-hidden src={fundo.valor} alt="" className="absolute inset-0 size-full object-cover" />;
  return (
    <video aria-hidden src={fundo.valor} autoPlay loop muted playsInline preload="auto" className="absolute inset-0 size-full object-cover" />
  );
}

const CANTOS: Record<Logo["posicao"], string> = {
  se: "top-[3.5%] left-[2.5%]",
  sd: "top-[3.5%] right-[2.5%]",
  ie: "bottom-[3.5%] left-[2.5%]",
  id: "bottom-[3.5%] right-[2.5%]",
};

export function LogoLive({ logo }: { logo: Logo }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- arquivo do próprio usuário no Storage
    <img src={logo.url} alt="" className={`absolute max-h-[13%] max-w-[14%] object-contain ${CANTOS[logo.posicao]}`} />
  );
}

/** Overlay: PNG transparente por cima de tudo (feito para 1920×1080). */
export function OverlayLive({ url }: { url: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- arquivo do próprio usuário no Storage
  return <img src={url} alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full object-cover" />;
}

/** Mídia em tela cheia (vídeo com som na live, ou imagem). */
export function MidiaTelaCheia({ midia, comSom }: { midia: Midia; comSom: boolean }) {
  const { ref, terminou, aoAcabar } = useVideoSincronizado(midia.inicioEm, midia.loop, comSom);
  if (!midia.video) {
    // eslint-disable-next-line @next/next/no-img-element -- arquivo do próprio usuário no Storage
    return <img src={midia.url} alt="" className="absolute inset-0 size-full animate-[aparecer_250ms_ease-out] bg-black object-contain" />;
  }
  return (
    <video
      ref={ref}
      src={midia.url}
      playsInline
      preload="auto"
      loop={midia.loop}
      onEnded={aoAcabar}
      className={`absolute inset-0 size-full bg-black object-contain transition-opacity duration-300 ${terminou ? "opacity-0" : "opacity-100"}`}
    />
  );
}

/** Vinheta: toca uma vez por cima de tudo e some ao terminar. */
export function VinhetaLive({ vinheta, comSom, aoTerminar }: { vinheta: Vinheta; comSom: boolean; aoTerminar?: () => void }) {
  const { ref, terminou, aoAcabar } = useVideoSincronizado(vinheta.inicioEm, false, comSom, aoTerminar);
  if (terminou) return null;
  return (
    <video ref={ref} src={vinheta.url} playsInline preload="auto" onEnded={aoAcabar} className="absolute inset-0 size-full object-cover" />
  );
}
