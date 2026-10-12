"use client";

import { useMemo } from "react";
import {
  AudioTrack,
  useIsSpeaking,
  useParticipantAttribute,
  useParticipantInfo,
  useParticipants,
  useTracks,
  VideoTrack,
  type TrackReference,
} from "@livekit/components-react";
import { Track, type Participant } from "livekit-client";
import type { Cena, CoresMarca } from "@/lib/cena";
import { urlFonte, type Estilo } from "@/lib/estilo";
import { BannerLive, CartaoComentario, EtiquetaNome } from "@/components/stage/Artes";
import { FundoEnviado, LogoLive, MidiaTelaCheia, OverlayLive, VinhetaLive } from "@/components/stage/Midias";
import { obterLayout, type Slot } from "@/lib/layouts";
import { ATRIBUTO_AUDIO_PRIVADO, ATRIBUTO_ESPELHAR, lerMetadados } from "@/lib/participante";
import { CartaoSoVoz } from "@/components/ui/CartaoSoVoz";

/**
 * Quem aparece de fato: está em noPalco, está na sala, não é "só diretor" e cabe no
 * layout. Essa lista decide o vídeo E o áudio da live (garantia do bastidor).
 */
export function usePalcoVisivel(cena: Cena) {
  const participantes = useParticipants();
  return useMemo(() => {
    const porIdentity = new Map(participantes.map((p) => [p.identity, p]));
    const presentes = cena.noPalco
      .map((id) => porIdentity.get(id))
      .filter((p) => p !== undefined)
      .filter((p) => !lerMetadados(p.metadata).soDiretor);
    return presentes.slice(0, obterLayout(cena.layoutId).maxPessoas);
  }, [participantes, cena.noPalco, cena.layoutId]);
}

type Props = {
  cena: Cena;
  /** Prévia no estúdio: mostra aviso quando o palco está vazio. No /stage, nada. */
  previa?: boolean;
  /** Som de mídias e vinhetas: só no /stage (a live). Na prévia o vídeo fica mudo. */
  comSom?: boolean;
  /** Chamado quando a vinheta acaba (o diretor tira a vinheta da cena). */
  aoTerminarVinheta?: () => void;
};

/** Quadro 16:9 da live. Tamanhos de texto em cqw: escala igual na prévia e em 1920×1080. */
export function Composicao({ cena, previa = false, comSom = false, aoTerminarVinheta }: Props) {
  const palco = usePalcoVisivel(cena);
  const slots = obterLayout(cena.layoutId).slots(palco.length);
  const cameras = useTracks([Track.Source.Camera], { onlySubscribed: false });

  return (
    <div
      className="@container relative aspect-video w-full overflow-hidden bg-[#070b16]"
      style={{ fontFamily: `"${cena.estilo.fonte}", ui-sans-serif, system-ui, sans-serif` }}
    >
      {/* Fonte das artes (Google Fonts). O React coloca o <link> no <head>. */}
      <link rel="stylesheet" href={urlFonte(cena.estilo.fonte)} precedence="default" />
      {/* Camadas de baixo para cima (seção 8.4). */}
      {cena.fundo ? <FundoEnviado fundo={cena.fundo} /> : <FundoMarca cores={cena.cores} />}

      {palco.map((p, i) => (
        <SlotPessoa
          key={p.identity}
          participante={p}
          slot={slots[i]}
          camera={cameras.find((c) => c.participant.identity === p.identity)}
          estilo={cena.estilo}
          cores={cena.cores}
          mostrarEtiqueta={!cena.etiquetasOcultas.includes(p.identity)}
        />
      ))}

      {cena.comentarioDestacado && (
        <CartaoComentario
          key={`${cena.comentarioDestacado.autor}|${cena.comentarioDestacado.texto}`}
          comentario={cena.comentarioDestacado}
          tema={cena.estilo.tema}
          cores={cena.cores}
          comBanner={cena.banner !== null}
        />
      )}

      {cena.banner && (
        <BannerLive key={`${cena.banner.estilo}|${cena.banner.texto}`} banner={cena.banner} tema={cena.estilo.tema} cores={cena.cores} />
      )}

      {cena.logo && <LogoLive logo={cena.logo} />}
      {cena.overlay && <OverlayLive url={cena.overlay} />}

      {cena.midia && <MidiaTelaCheia key={`${cena.midia.url}|${cena.midia.inicioEm}`} midia={cena.midia} comSom={comSom} />}

      {/* Intervalo sem mídia "Volto logo" enviada: tela simples da marca. */}
      {((cena.status === "intervalo" && !cena.midia) || cena.status === "encerrada") && (
        <TelaCheiaMarca cores={cena.cores} texto={cena.status === "intervalo" ? "Já voltamos" : "Transmissão encerrada"} />
      )}

      {cena.vinheta && (
        <VinhetaLive
          key={`${cena.vinheta.url}|${cena.vinheta.inicioEm}`}
          vinheta={cena.vinheta}
          comSom={comSom}
          aoTerminar={aoTerminarVinheta}
        />
      )}

      {previa && palco.length === 0 && !cena.midia && cena.status !== "intervalo" && cena.status !== "encerrada" && (
        <p className="absolute inset-0 flex items-center justify-center text-[2.2cqw] text-texto-suave">
          Ninguém no palco. Escolha quem aparece em Pessoas.
        </p>
      )}
    </div>
  );
}

/**
 * Fundo padrão (sem imagem/vídeo enviado): degradê com as cores da marca — primária
 * no alto à esquerda, secundária embaixo à direita, sobre uma base escura tingida
 * pela primária. color-mix deixa qualquer cor escolhida pelo usuário funcionar.
 */
export function FundoMarca({ cores }: { cores: CoresMarca }) {
  const { primaria, secundaria } = cores;
  return (
    <div
      aria-hidden
      className="absolute inset-0 transition-[background] duration-500"
      style={{
        background: [
          `radial-gradient(75% 95% at 0% 0%, color-mix(in srgb, ${primaria} 42%, transparent), transparent 62%)`,
          `radial-gradient(65% 85% at 100% 100%, color-mix(in srgb, ${secundaria} 34%, transparent), transparent 62%)`,
          `linear-gradient(135deg, color-mix(in srgb, ${primaria} 14%, #05070d), color-mix(in srgb, ${secundaria} 10%, #05070d))`,
        ].join(", "),
      }}
    />
  );
}

/** Tela cheia sobre tudo (intervalo/encerrada): fundo da marca e um texto grande. */
function TelaCheiaMarca({ cores, texto }: { cores: CoresMarca; texto: string }) {
  return (
    <div className="absolute inset-0 animate-[aparecer_300ms_ease-out] motion-reduce:animate-none">
      <FundoMarca cores={cores} />
      <p className="absolute inset-0 flex items-center justify-center text-[5cqw] font-semibold tracking-tight text-white">
        {texto}
      </p>
    </div>
  );
}

/**
 * No formato círculo, a moldura vira um quadrado centrado no slot. O tamanho sai da
 * proporção do slot no quadro 16:9 (sem medir nada na tela).
 */
function caixaDaMoldura(slot: Slot, formato: Estilo["camera"]["formato"]) {
  if (formato !== "circulo") return { left: "0%", top: "0%", width: "100%", height: "100%" };
  const proporcao = (slot.w * 16) / (slot.h * 9); // largura/altura do slot em pixels
  const w = proporcao > 1 ? 100 / proporcao : 100;
  const h = proporcao > 1 ? 100 : proporcao * 100;
  return { left: `${(100 - w) / 2}%`, top: `${(100 - h) / 2}%`, width: `${w}%`, height: `${h}%` };
}

type PropsSlot = {
  participante: Participant;
  slot: Slot;
  camera?: TrackReference;
  estilo: Estilo;
  cores: CoresMarca;
  mostrarEtiqueta: boolean;
};

function SlotPessoa({ participante, slot, camera, estilo, cores, mostrarEtiqueta }: PropsSlot) {
  const { name, metadata } = useParticipantInfo({ participant: participante });
  const { etiqueta } = lerMetadados(metadata);
  const falando = useIsSpeaking(participante);
  const espelhado = useParticipantAttribute(ATRIBUTO_ESPELHAR, { participant: participante }) === "1";
  const comVideo = camera !== undefined && !camera.publication.isMuted;
  const nome = name || "Participante";

  const { camera: moldura } = estilo;
  const circulo = moldura.formato === "circulo";
  const raio = circulo ? "50%" : moldura.formato === "arredondado" ? "1.2cqw" : "0";

  return (
    <div
      className="absolute transition-[left,top,width,height] duration-300 ease-out motion-reduce:transition-none"
      style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.w}%`, height: `${slot.h}%` }}
    >
      <div
        className="absolute overflow-hidden bg-superficie-2 transition-[border-radius] duration-300"
        style={{
          ...caixaDaMoldura(slot, moldura.formato),
          borderRadius: raio,
        }}
      >
        {comVideo ? (
          <VideoTrack trackRef={camera} className={`size-full object-cover ${espelhado ? "-scale-x-100" : ""}`} />
        ) : (
          <CartaoSoVoz nome={nome} falando={falando} className="absolute inset-0" />
        )}
        {/* Borda por cima do vídeo, em px do quadro 1920×1080 → cqw (1cqw = 19,2px). */}
        {moldura.borda > 0 && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ borderRadius: raio, boxShadow: `inset 0 0 0 ${moldura.borda / 19.2}cqw ${moldura.corBorda}` }}
          />
        )}
      </div>

      {mostrarEtiqueta && (
        <div
          className={`absolute bottom-[5%] max-w-[90%] ${circulo ? "left-1/2 -translate-x-1/2" : "left-[3%]"}`}
        >
          <EtiquetaNome nome={nome} etiqueta={etiqueta} tema={estilo.tema} cores={cores} />
        </div>
      )}
    </div>
  );
}

/**
 * Só no /stage: toca o microfone de quem está visível no palco, e de mais ninguém.
 * No intervalo e depois de encerrada, ninguém é ouvido na live. Quem está "mudo para a
 * live" também não. O ponto do diretor nunca é tocado (e o /stage nem tem permissão de ouvi-lo).
 */
export function AudioPalco({ cena }: { cena: Cena }) {
  const palco = usePalcoVisivel(cena);
  const microfones = useTracks([Track.Source.Microphone]);
  const silencio = cena.status === "intervalo" || cena.status === "encerrada";
  const visiveis = new Set(silencio ? [] : palco.map((p) => p.identity));
  return (
    <>
      {microfones
        // A própria voz nunca volta (no estúdio, com "Ouvir a live" ligado).
        .filter((m) => visiveis.has(m.participant.identity) && !m.participant.isLocal)
        .map((m) => (
          <AudioSeNaoPrivado key={m.participant.identity} trackRef={m} />
        ))}
    </>
  );
}

/** "Mudo para a live": reage ao atributo na hora; o vídeo continua, a voz não vai ao ar. */
function AudioSeNaoPrivado({ trackRef }: { trackRef: TrackReference }) {
  const privado = useParticipantAttribute(ATRIBUTO_AUDIO_PRIVADO, { participant: trackRef.participant }) === "1";
  return privado ? null : <AudioTrack trackRef={trackRef} />;
}
