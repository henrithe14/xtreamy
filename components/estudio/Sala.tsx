"use client";

import {
  RoomAudioRenderer,
  useAudioPlayback,
  useConnectionState,
  useRoomContext,
  useLocalParticipant,
  useTrackToggle,
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
import { useCena, useControleCena } from "@/hooks/useCena";
import type { Cena } from "@/lib/cena";
import type { PapelSala } from "@/lib/participante";
import { SimboloMarca } from "@/components/ui/Marca";
import { Botao } from "@/components/ui/Botao";
import { BotaoBarra } from "@/components/estudio/BotaoBarra";
import { BotaoConvidar } from "@/components/estudio/BotaoConvidar";
import { PainelPessoas } from "@/components/estudio/PainelPessoas";
import { Previa } from "@/components/estudio/Previa";
import { SeletorLayout } from "@/components/estudio/SeletorLayout";

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

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraSuperior titulo={titulo} papel={papel} soDiretor={soDiretor} />
      <AvisoSom />
      {falhaAparelho && <AvisoAparelho falha={falhaAparelho} aoFechar={aoFecharAvisoAparelho} />}

      {souHost ? <PainelDiretor transmissaoId={transmissaoId} /> : <PainelConvidado />}

      <nav
        aria-label="Controles"
        className="sticky bottom-0 z-20 flex flex-wrap items-center justify-center gap-2 border-t border-vidro-borda bg-fundo/60 px-3 py-3 backdrop-blur-xl deitado:py-1.5"
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

/** Diretor: prévia + disposições à esquerda, pessoas (palco/bastidor) à direita. */
function PainelDiretor({ transmissaoId }: { transmissaoId: string }) {
  const { cena, alterar, erro } = useControleCena(transmissaoId);
  return (
    <main className="mx-auto grid w-full max-w-[100rem] flex-1 gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] lg:items-start deitado:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] deitado:items-start deitado:gap-3 deitado:p-2">
      <div className="flex min-w-0 flex-col gap-4 deitado:gap-2">
        <Previa cena={cena} urlSaida={`/stage?t=${transmissaoId}`} />
        {erro && (
          <p role="alert" className="text-sm text-no-ar">
            {erro}
          </p>
        )}
        <SeletorLayout
          layoutId={cena.layoutId}
          pessoasNoPalco={cena.noPalco.length}
          aoEscolher={(layoutId) => alterar((c) => ({ ...c, layoutId }))}
        />
      </div>
      <PainelPessoas cena={cena} transmissaoId={transmissaoId} alterar={alterar} />
    </main>
  );
}

/** Convidado: vê a prévia da live e se está no palco ou no bastidor. */
function PainelConvidado() {
  const cena = useCena();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-4 p-3 sm:p-5 deitado:gap-2 deitado:p-2">
      <EstadoNoPalco cena={cena} />
      <Previa cena={cena} />
    </main>
  );
}

function EstadoNoPalco({ cena }: { cena: Cena }) {
  const { localParticipant } = useLocalParticipant();
  const noPalco = cena.noPalco.includes(localParticipant.identity);
  return (
    <p
      role="status"
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-inset ${
        noPalco ? "bg-pronto/10 text-pronto ring-pronto/25" : "bg-white/[0.04] text-texto-suave ring-white/10"
      }`}
    >
      <span className={`size-2.5 rounded-full ${noPalco ? "bg-pronto" : "bg-texto-suave"}`} aria-hidden />
      {noPalco
        ? "Você está no palco: aparece na prévia da live."
        : "Você está no bastidor: a equipe vê e ouve você, mas você não aparece na live."}
    </p>
  );
}

function BarraSuperior({ titulo, papel, soDiretor }: { titulo: string; papel: PapelSala; soDiretor: boolean }) {
  const estado = useConnectionState();
  const reconectando = estado === ConnectionState.Reconnecting || estado === ConnectionState.SignalReconnecting;

  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center gap-3 border-b border-vidro-borda bg-fundo/60 px-3 backdrop-blur-xl sm:px-6 deitado:min-h-10">
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
