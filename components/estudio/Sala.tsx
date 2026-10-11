"use client";

import {
  RoomAudioRenderer,
  useAudioPlayback,
  useConnectionState,
  useRoomContext,
  useTrackToggle,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, MediaDeviceFailure, Track } from "livekit-client";
import {
  Microphone,
  MicrophoneSlash,
  SignOut,
  SpeakerSimpleSlash,
  VideoCamera,
  VideoCameraSlash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type { PapelSala } from "@/lib/participante";
import { SimboloMarca } from "@/components/ui/Marca";
import { Botao } from "@/components/ui/Botao";
import { BotaoBarra } from "@/components/estudio/BotaoBarra";
import { BotaoConvidar } from "@/components/estudio/BotaoConvidar";
import { CartaoParticipante } from "@/components/estudio/CartaoParticipante";

type Props = {
  transmissaoId: string;
  titulo: string;
  papel: PapelSala;
  urlConvite?: string;
  /** Diretor que só controla: não publica câmera. */
  soDiretor: boolean;
  falhaAparelho?: MediaDeviceFailure;
  aoFecharAvisoAparelho: () => void;
  aoSair: () => void;
};

export function Sala({
  transmissaoId,
  titulo,
  papel,
  urlConvite,
  soDiretor,
  falhaAparelho,
  aoFecharAvisoAparelho,
  aoSair,
}: Props) {
  const souHost = papel === "host";
  const cameras = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false,
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraSuperior titulo={titulo} papel={papel} soDiretor={soDiretor} />
      <AvisoSom />
      {falhaAparelho && <AvisoAparelho falha={falhaAparelho} aoFechar={aoFecharAvisoAparelho} />}

      <main className="flex-1 p-3 sm:p-6">
        <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,18rem),1fr))]">
          {cameras.map((ref) => (
            <li key={ref.participant.identity}>
              <CartaoParticipante trackRef={ref} transmissaoId={transmissaoId} souHost={souHost} />
            </li>
          ))}
        </ul>
      </main>

      <nav
        aria-label="Controles"
        className="sticky bottom-0 flex flex-wrap items-center justify-center gap-2 border-t border-vidro-borda bg-fundo/60 px-3 py-3 backdrop-blur-xl"
      >
        <AlternarMidia fonte={Track.Source.Microphone} />
        {!soDiretor && <AlternarMidia fonte={Track.Source.Camera} />}
        {souHost && urlConvite && <BotaoConvidar transmissaoId={transmissaoId} urlInicial={urlConvite} />}
        <BotaoBarra rotulo="Sair" perigo onClick={aoSair}>
          <SignOut weight="fill" />
        </BotaoBarra>
      </nav>

      {/* Toca o áudio de todos na sala (a equipe se ouve). */}
      <RoomAudioRenderer />
    </div>
  );
}

function BarraSuperior({ titulo, papel, soDiretor }: { titulo: string; papel: PapelSala; soDiretor: boolean }) {
  const estado = useConnectionState();
  const reconectando = estado === ConnectionState.Reconnecting || estado === ConnectionState.SignalReconnecting;

  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center gap-3 border-b border-vidro-borda bg-fundo/60 px-3 backdrop-blur-xl sm:px-6">
      <SimboloMarca className="size-7 shrink-0" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-semibold">{titulo}</h1>
        <p className="text-xs text-texto-suave">
          {papel === "convidado" ? "Convidado" : soDiretor ? "Só diretor: você não aparece na live" : "Diretor e apresentador"}
        </p>
      </div>
      {reconectando && (
        <p role="status" className="flex items-center gap-2 rounded-full bg-ensaio/15 px-3 py-1 text-sm font-semibold text-ensaio">
          <span className="tally-pulso size-2 rounded-full bg-ensaio" aria-hidden />
          Reconectando…
        </p>
      )}
    </header>
  );
}

const TEXTO_FALHA: Record<MediaDeviceFailure, string> = {
  [MediaDeviceFailure.PermissionDenied]:
    "O navegador bloqueou a câmera ou o microfone. Permita no cadeado ao lado do endereço e ligue de novo na barra abaixo.",
  [MediaDeviceFailure.NotFound]: "Não encontramos a câmera ou o microfone escolhido. Você continua na sala sem eles.",
  [MediaDeviceFailure.DeviceInUse]: "A câmera ou o microfone está em uso por outro programa. Feche-o e ligue de novo.",
  [MediaDeviceFailure.Other]: "Não foi possível ligar a câmera ou o microfone. Você continua na sala.",
};

/** Câmera/microfone falharam: a pessoa continua na sala e pode tentar ligar pela barra. */
function AvisoAparelho({ falha, aoFechar }: { falha: MediaDeviceFailure; aoFechar: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 bg-no-ar/10 px-4 py-2.5 text-no-ar sm:items-center">
      <WarningCircle weight="fill" className="mt-0.5 size-5 shrink-0 sm:mt-0" aria-hidden />
      <p className="flex-1 text-sm">{TEXTO_FALHA[falha]}</p>
      <button type="button" onClick={aoFechar} aria-label="Fechar aviso" className="rounded p-1 hover:bg-no-ar/15">
        <X weight="bold" className="size-4" />
      </button>
    </div>
  );
}

/** No iPhone/Safari o som da sala só começa depois de um toque. */
function AvisoSom() {
  const room = useRoomContext();
  const { canPlayAudio, startAudio } = useAudioPlayback(room);
  if (canPlayAudio) return null;
  return (
    <div role="alert" className="flex flex-wrap items-center justify-center gap-3 bg-ensaio/15 px-4 py-2 text-ensaio">
      <SpeakerSimpleSlash weight="fill" className="size-5" aria-hidden />
      <span>O navegador pausou o som da sala.</span>
      <Botao variante="secundario" onClick={() => void startAudio()}>
        Ativar som
      </Botao>
    </div>
  );
}

function AlternarMidia({ fonte }: { fonte: Track.Source.Microphone | Track.Source.Camera }) {
  const { enabled, pending, toggle } = useTrackToggle({ source: fonte });
  const mic = fonte === Track.Source.Microphone;
  const Icone = mic ? (enabled ? Microphone : MicrophoneSlash) : enabled ? VideoCamera : VideoCameraSlash;
  const rotulo = mic ? (enabled ? "Microfone" : "Mic. desligado") : enabled ? "Câmera" : "Câmera desligada";

  return (
    <BotaoBarra rotulo={rotulo} ligado={enabled} desativado={pending} onClick={() => void toggle()}>
      <Icone weight="fill" />
    </BotaoBarra>
  );
}
