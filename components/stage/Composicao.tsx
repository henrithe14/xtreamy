"use client";

import { useMemo } from "react";
import {
  AudioTrack,
  useIsSpeaking,
  useParticipantInfo,
  useParticipants,
  useTracks,
  VideoTrack,
  type TrackReference,
} from "@livekit/components-react";
import { Track, type Participant } from "livekit-client";
import type { Cena, CoresMarca } from "@/lib/cena";
import { obterLayout, type Slot } from "@/lib/layouts";
import { lerMetadados } from "@/lib/participante";
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
};

/** Quadro 16:9 da live. Tamanhos de texto em cqw: escala igual na prévia e em 1920×1080. */
export function Composicao({ cena, previa = false }: Props) {
  const palco = usePalcoVisivel(cena);
  const slots = obterLayout(cena.layoutId).slots(palco.length);
  const cameras = useTracks([Track.Source.Camera], { onlySubscribed: false });

  return (
    <div className="@container relative aspect-video w-full overflow-hidden bg-[#070b16]">
      <FundoMarca cores={cena.cores} />

      {palco.map((p, i) => (
        <SlotPessoa
          key={p.identity}
          participante={p}
          slot={slots[i]}
          camera={cameras.find((c) => c.participant.identity === p.identity)}
        />
      ))}

      {previa && palco.length === 0 && (
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

function SlotPessoa({ participante, slot, camera }: { participante: Participant; slot: Slot; camera?: TrackReference }) {
  const { name, metadata } = useParticipantInfo({ participant: participante });
  const { etiqueta } = lerMetadados(metadata);
  const falando = useIsSpeaking(participante);
  const comVideo = camera !== undefined && !camera.publication.isMuted;
  const nome = name || "Participante";

  return (
    <div
      className="absolute overflow-hidden rounded-[0.6cqw] bg-superficie-2 transition-[left,top,width,height] duration-300 ease-out motion-reduce:transition-none"
      style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.w}%`, height: `${slot.h}%` }}
    >
      {comVideo ? (
        <VideoTrack trackRef={camera} className="size-full object-cover" />
      ) : (
        <CartaoSoVoz nome={nome} falando={falando} className="absolute inset-0" />
      )}

      {/* Etiqueta: nome + etiqueta do participante. */}
      <div className="absolute bottom-[4%] left-[3%] max-w-[90%] rounded-[0.4cqw] bg-black/55 px-[1cqw] py-[0.5cqw] backdrop-blur-md">
        <p className="truncate text-[1.5cqw] font-semibold leading-tight text-white">{nome}</p>
        {etiqueta && <p className="truncate text-[1.1cqw] leading-tight text-white/75">{etiqueta}</p>}
      </div>
    </div>
  );
}

/** Só no /stage: toca o microfone de quem está visível no palco, e de mais ninguém. */
export function AudioPalco({ cena }: { cena: Cena }) {
  const palco = usePalcoVisivel(cena);
  const microfones = useTracks([Track.Source.Microphone]);
  const visiveis = new Set(palco.map((p) => p.identity));
  return (
    <>
      {microfones
        .filter((m) => visiveis.has(m.participant.identity))
        .map((m) => (
          <AudioTrack key={m.participant.identity} trackRef={m} />
        ))}
    </>
  );
}
