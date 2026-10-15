"use client";

import { useMemo, useState } from "react";
import {
  RoomAudioRenderer,
  useAudioPlayback,
  useConnectionState,
  useRoomContext,
  useIsSpeaking,
  useLocalParticipant,
  useParticipantAttribute,
  useParticipantInfo,
  useRemoteParticipants,
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
  Headset,
  SpeakerSimpleHigh,
  SpeakerSimpleSlash as IconeMudoLive,
  UserFocus,
  FlipHorizontal,
  Monitor,
} from "@phosphor-icons/react";
import { useAlternarEspelho, useAlternarMudoParaLive, useEspelhado, useMudoParaLive } from "@/hooks/useAudioPrivado";
import { usePonto } from "@/hooks/usePonto";
import { usePortaoRuido } from "@/hooks/usePortaoRuido";
import { ATRIBUTO_DIRETOR, ehPonto, lerMetadados } from "@/lib/participante";
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
import { ChatEstudio, PainelComentarios } from "@/components/estudio/PainelComentarios";
import { PainelEstilo } from "@/components/estudio/PainelEstilo";
import { PainelBanners } from "@/components/estudio/PainelBanners";
import { PainelMidia } from "@/components/estudio/PainelMidia";
import { PainelAudio } from "@/components/estudio/PainelAudio";
import { AudioLive, TrilhaNaSala } from "@/components/stage/AudioLive";
import { BotaoRecadoBarra, ProvedorRecados } from "@/components/estudio/Recados";
import { TelasCompartilhadas } from "@/components/estudio/TelasCompartilhadas";
import { BotaoGravar } from "@/components/estudio/BotaoGravar";
import { AtalhoEfeitos } from "@/components/estudio/AtalhoEfeitos";
import { ControlesLive, Cronometro } from "@/components/estudio/ControlesLive";
import { StatusTally } from "@/components/ui/StatusTally";

type Props = {
  transmissaoId: string;
  /** Código do convite (convidado): identifica a pessoa nas ações do servidor. */
  codigo?: string;
  titulo: string;
  papel: PapelSala;
  urlConvite?: string;
  /** Diretor que só controla: não publica câmera. */
  soDiretor: boolean;
  /** A transmissão tem live criada no YouTube (pode iniciar). */
  temCanal: boolean;
  /** A live no YouTube tem chat (o diretor lê e destaca comentários). */
  temChat: boolean;
  /** Id do vídeo da live no YouTube (chat incorporado). */
  videoYoutube?: string;
  falhaAparelho?: MediaDeviceFailure;
  /** Microfone só transmite quando a pessoa fala. */
  portaoRuido: boolean;
  aoFecharAvisoAparelho: () => void;
  aoSair: () => void;
};

export function Sala({
  transmissaoId,
  codigo,
  titulo,
  papel,
  urlConvite,
  soDiretor: soDiretorInicial,
  temCanal,
  temChat,
  videoYoutube,
  falhaAparelho,
  portaoRuido,
  aoFecharAvisoAparelho,
  aoSair,
}: Props) {
  usePortaoRuido(portaoRuido);
  const souHost = papel === "host";
  // Diretor delegado: convidado a quem o dono passou a direção (atributo gravado pelo servidor).
  const delegado =
    useParticipantAttribute(ATRIBUTO_DIRETOR, { participant: useLocalParticipant().localParticipant }) === "1" && !souHost;
  const dirige = souHost || delegado;
  // O modo do diretor pode mudar durante a live: vale o que está no metadata agora.
  const { localParticipant } = useLocalParticipant();
  const { metadata } = useParticipantInfo({ participant: localParticipant });
  const soDiretor = metadata ? lerMetadados(metadata).soDiretor : soDiretorInicial;
  // "Ouvir a live": o diretor troca o som da sala pela mixagem que vai ao ar.
  const [ouvindoLive, setOuvindoLive] = useState(false);
  const cenaSala = useCena();

  return (
    // Diretor no desktop: a página não rola; a prévia fica fixa e só a lateral rola.
    <ProvedorRecados>
      <div className={`flex min-h-dvh flex-col ${dirige ? "lg:h-dvh lg:overflow-hidden" : ""}`}>
        <BarraSuperior
          titulo={titulo}
          papel={papel}
          delegado={delegado}
          codigo={codigo}
          soDiretor={soDiretor}
          transmissaoId={transmissaoId}
          temCanal={temCanal}
        />
        <AvisoSom />
        {falhaAparelho && <AvisoAparelho falha={falhaAparelho} aoFechar={aoFecharAvisoAparelho} />}

        {!souHost && <AvisoPontoRecebido />}

        {dirige ? (
          <PainelDiretor
            transmissaoId={transmissaoId}
            codigo={delegado ? codigo : undefined}
            temChat={temChat}
            videoYoutube={videoYoutube}
            ouvindo={ouvindoLive}
            aoAlternarOuvir={() => setOuvindoLive((v) => !v)}
          />
        ) : (
          <PainelConvidado />
        )}

        <nav
          aria-label="Controles"
          className="sticky bottom-0 z-20 flex flex-wrap items-center justify-center gap-2 border-t border-vidro-borda bg-fundo/60 px-3 py-3 backdrop-blur-xl deitado:py-1.5"
        >
          <AlternarMidia fonte={Track.Source.Microphone} />
          {!soDiretor && <AlternarMidia fonte={Track.Source.Camera} />}
          {!soDiretor && <BotaoMudoParaLive transmissaoId={transmissaoId} codigo={codigo} />}
          {!soDiretor && <BotaoEspelhar transmissaoId={transmissaoId} codigo={codigo} />}
          <BotaoApresentar />
          <BotaoRecadoBarra />
          {souHost && urlConvite && <BotaoConvidar transmissaoId={transmissaoId} urlInicial={urlConvite} />}
          <BotaoBarra rotulo="Sair" perigo onClick={aoSair}>
            <SignOut weight="bold" />
          </BotaoBarra>
        </nav>

        {/* A equipe se ouve e ouve a música e os efeitos da live; "Ouvir a live" troca tudo pela mixagem. */}
        {dirige && ouvindoLive ? (
          <AudioLive cena={cenaSala} />
        ) : (
          <>
            <RoomAudioRenderer />
            <TrilhaNaSala cena={cenaSala} />
          </>
        )}
      </div>
    </ProvedorRecados>
  );
}

/** Diretor: prévia + disposições à esquerda, pessoas (palco/bastidor) à direita. */
type PropsDiretor = {
  transmissaoId: string;
  /** Só para o diretor delegado: o servidor confere a direção pelo convite. */
  codigo?: string;
  temChat: boolean;
  videoYoutube?: string;
  ouvindo: boolean;
  aoAlternarOuvir: () => void;
};

function PainelDiretor({ transmissaoId, codigo, temChat, videoYoutube, ouvindo, aoAlternarOuvir }: PropsDiretor) {
  const dono = !codigo;
  const { cena, alterar, erro } = useControleCena(transmissaoId, codigo);
  const sala = useMemo(() => (codigo ? { transmissaoId, codigo } : undefined), [transmissaoId, codigo]);
  const [abaLateral, setAbaLateral] = useState<
    "pessoas" | "comentarios" | "estilo" | "banners" | "midia" | "audio"
  >("pessoas");

  async function editarEtiqueta(identity: string, etiqueta: string) {
    await fetch("/api/participante", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transmissaoId, codigo, alvo: identity, etiqueta }),
    });
  }
  const ponto = usePonto(transmissaoId);
  const mudo = useAlternarMudoParaLive(transmissaoId, codigo);
  const espelho = useAlternarEspelho(transmissaoId, codigo);
  const participantes = useRemoteParticipants();
  const localIdentity = useLocalParticipant().localParticipant.identity;
  const nomeAlvo = participantes.find((p) => p.identity === ponto.alvo)?.name;
  return (
    <main className="mx-auto grid w-full max-w-[100rem] flex-1 gap-4 p-3 sm:p-5 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] lg:grid-rows-[minmax(0,1fr)] deitado:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] deitado:items-start deitado:gap-3 deitado:p-2">
      <div className="flex min-w-0 flex-col gap-4 lg:min-h-0 lg:overflow-y-auto deitado:gap-2">
        {ponto.alvo && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-3 rounded-xl bg-destaque/10 px-4 py-2.5 text-sm ring-1 ring-destaque/30 ring-inset"
          >
            <Headset weight="bold" className="size-5 text-destaque" aria-hidden />
            <span className="flex-1">
              {ponto.conectando
                ? "Ligando o ponto…"
                : `Ponto ligado com ${nomeAlvo ?? "a pessoa"}: só ela ouve você. Seu microfone na sala está mudo.`}
            </span>
            <Botao variante="secundario" onClick={() => void ponto.desligar()}>
              Desligar ponto
            </Botao>
          </div>
        )}
        {(ponto.erro || mudo.erro || espelho.erro) && (
          <p role="alert" className="text-sm text-no-ar">
            {ponto.erro ?? mudo.erro ?? espelho.erro}
          </p>
        )}
        <Previa
          cena={cena}
          urlSaida={`/stage?t=${transmissaoId}`}
          ouvindo={ouvindo}
          aoAlternarOuvir={aoAlternarOuvir}
          // A vinheta sai da cena quando termina, com 15 s de folga: a live (Egress) começa
          // a tocar alguns segundos depois da prévia e não pode ser cortada no fim.
          aoTerminarVinheta={() => {
            const fim = cena.vinheta;
            if (!fim) return;
            window.setTimeout(
              () => alterar((c) => ({ ...c, vinheta: c.vinheta?.inicioEm === fim.inicioEm ? null : c.vinheta })),
              15_000,
            );
          }}
        />
        {erro && (
          <p role="alert" className="text-sm text-no-ar">
            {erro}
          </p>
        )}
        <TelasCompartilhadas cena={cena} alterar={alterar} />
        <SeletorLayout
          layoutId={cena.layoutId}
          tamanhoSolo={cena.tamanhoSolo}
          aoMudarTamanhoSolo={(tamanhoSolo) => alterar((c) => ({ ...c, tamanhoSolo }))}
            posicaoCameras={cena.posicaoCameras}
            aoMudarPosicaoCameras={(posicaoCameras) => alterar((c) => ({ ...c, posicaoCameras }))}
          pessoasNoPalco={cena.noPalco.length}
          aoEscolher={(layoutId) => alterar((c) => ({ ...c, layoutId }))}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-3 lg:min-h-0">
        <div role="tablist" aria-label="Painel lateral" className="vidro flex gap-1 rounded-xl p-1">
          {(
            [
              ["pessoas", "Pessoas"],
              ["comentarios", "Comentários"],
              ["estilo", "Estilo"],
              ["banners", "Banners"],
              ["midia", "Mídia"],
              ["audio", "Áudio"],
            ] as const
          ).map(([id, rotulo]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={abaLateral === id}
              onClick={() => setAbaLateral(id)}
              className={`flex-1 shrink-0 rounded-lg px-1.5 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                abaLateral === id ? "bg-white/10 text-texto" : "text-texto-suave hover:text-texto"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
        {/* Só o conteúdo das abas rola; as abas ficam fixas no alto. */}
        <div className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
          {/* As abas ficam montadas: o chat continua chegando com a aba fechada. */}
          <div hidden={abaLateral !== "pessoas"}>
            <PainelPessoas
              cena={cena}
              transmissaoId={transmissaoId}
              alterar={alterar}
              controles={{
                alternarMudo: (identity, valor) => void mudo.alternar(identity, valor),
                mudoPendente: mudo.pendente,
              // Na própria câmera, a escolha fica lembrada para a próxima entrada.
              alternarEspelho: (identity, valor) => void espelho.alternar(identity, valor, identity === localIdentity),
              espelhoPendente: espelho.pendente,
                ponto: dono ? ponto : null,
                alternarDirecao: dono
                  ? (identity, diretor) =>
                      void fetch("/api/participante", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ transmissaoId, alvo: identity, diretor }),
                      })
                  : null,
                codigo,
                etiquetasOcultas: cena.etiquetasOcultas,
                alternarEtiqueta: (identity) =>
                  alterar((c) => ({
                    ...c,
                    etiquetasOcultas: c.etiquetasOcultas.includes(identity)
                      ? c.etiquetasOcultas.filter((x) => x !== identity)
                      : [...c.etiquetasOcultas, identity],
                  })),
                camerasOcultas: cena.camerasOcultas,
                alternarCamera: (identity) =>
                  alterar((c) => ({
                    ...c,
                    camerasOcultas: c.camerasOcultas.includes(identity)
                      ? c.camerasOcultas.filter((x) => x !== identity)
                      : [...c.camerasOcultas, identity],
                  })),
                editarEtiqueta,
              }}
            />
          </div>
          <section hidden={abaLateral !== "comentarios"} aria-label="Comentários" className="vidro rounded-xl p-3 sm:p-4">
            <PainelComentarios
              transmissaoId={transmissaoId}
              codigo={codigo}
              temChat={temChat}
              videoYoutube={videoYoutube}
              destaque={{
                atual: cena.comentarioDestacado,
                mostrar: (comentario) => alterar((c) => ({ ...c, comentarioDestacado: comentario })),
                ocultar: () => alterar((c) => ({ ...c, comentarioDestacado: null })),
              }}
            />
          </section>
          <section hidden={abaLateral !== "estilo"} aria-label="Estilo" className="vidro rounded-xl p-3 sm:p-4">
            <PainelEstilo cena={cena} alterar={alterar} salvos={dono} />
          </section>
          <section hidden={abaLateral !== "banners"} aria-label="Banners" className="vidro rounded-xl p-3 sm:p-4">
            <PainelBanners cena={cena} alterar={alterar} salvos={dono} />
          </section>
          <section hidden={abaLateral !== "midia"} aria-label="Mídia" className="vidro rounded-xl p-3 sm:p-4">
            <PainelMidia cena={cena} alterar={alterar} sala={sala} />
          </section>
          <section hidden={abaLateral !== "audio"} aria-label="Áudio" className="vidro rounded-xl p-3 sm:p-4">
            <PainelAudio cena={cena} alterar={alterar} sala={sala} />
          </section>
        </div>
      </div>
    </main>
  );
}

/** Convidado: vê a prévia da live e se está no palco ou no bastidor. */
function PainelConvidado() {
  const cena = useCena();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-4 p-3 sm:p-5 deitado:gap-2 deitado:p-2">
      <EstadoNoPalco cena={cena} />
      <AvisoApresentando cena={cena} />
      <Previa cena={cena} />
      <section aria-label="Chat da equipe" className="vidro w-full max-w-2xl rounded-xl p-3 sm:p-4">
        <h2 className="mb-2 text-sm font-semibold">Chat da equipe</h2>
        <ChatEstudio />
      </section>
    </main>
  );
}

function EstadoNoPalco({ cena }: { cena: Cena }) {
  const { localParticipant } = useLocalParticipant();
  const noPalco = cena.noPalco.includes(localParticipant.identity);
  const mudoParaLive = useMudoParaLive(localParticipant);
  return (
    <p
      role="status"
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-inset ${
        noPalco ? "bg-pronto/10 text-pronto ring-pronto/25" : "bg-white/[0.04] text-texto-suave ring-white/10"
      }`}
    >
      <span className={`size-2.5 rounded-full ${noPalco ? "bg-pronto" : "bg-texto-suave"}`} aria-hidden />
      {noPalco
        ? mudoParaLive
          ? "Você está no palco, mas mudo para a live: aparece, e só a equipe ouve você."
          : "Você está no palco: aparece na prévia da live."
        : "Você está no bastidor: a equipe vê e ouve você, mas você não aparece na live."}
    </p>
  );
}

type PropsBarra = {
  titulo: string;
  papel: PapelSala;
  delegado: boolean;
  codigo?: string;
  soDiretor: boolean;
  transmissaoId: string;
  temCanal: boolean;
};

function BarraSuperior({ titulo, papel, delegado, codigo, soDiretor, transmissaoId, temCanal }: PropsBarra) {
  const dirige = papel === "host" || delegado;
  const codigoDelegado = delegado ? codigo : undefined;
  const salaDelegado = useMemo(() => (codigoDelegado ? { transmissaoId, codigo: codigoDelegado } : undefined), [transmissaoId, codigoDelegado]);
  const cena = useCena();
  const estado = useConnectionState();
  const reconectando = estado === ConnectionState.Reconnecting || estado === ConnectionState.SignalReconnecting;

  return (
    <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-b border-vidro-borda bg-fundo/60 px-3 py-2 backdrop-blur-xl sm:px-6 deitado:min-h-10 deitado:py-1">
      <SimboloMarca aoVivo={cena.status === "ao_vivo"} className="size-7 shrink-0" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-semibold">{titulo}</h1>
        <p className="text-xs text-texto-suave">
          {delegado ? "Convidado com a direção" : papel === "convidado" ? "Convidado" : soDiretor ? "Só diretor: você não aparece na live" : "Diretor e apresentador"}
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <StatusTally status={cena.status} />
        {cena.status === "ao_vivo" && cena.noArDesde && (
          <span className="text-no-ar">
            <Cronometro desde={cena.noArDesde} />
          </span>
        )}
      </div>
      {papel === "host" && <BotaoModoDiretor transmissaoId={transmissaoId} soDiretor={soDiretor} />}
      {dirige && <AtalhoEfeitos sala={salaDelegado} />}
      {dirige && <BotaoGravar transmissaoId={transmissaoId} codigo={codigoDelegado} />}
      {dirige && <ControlesLive transmissaoId={transmissaoId} codigo={codigoDelegado} cena={cena} temCanal={temCanal} />}
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
      <WarningCircle weight="bold" className="mt-0.5 size-5 shrink-0 sm:mt-0" aria-hidden />
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
      <SpeakerSimpleSlash weight="bold" className="size-5" aria-hidden />
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
      <Icone weight="bold" />
    </BotaoBarra>
  );
}

/** Alterna "Só diretor" e "Diretor e apresentador" durante a sessão. */
function BotaoModoDiretor({ transmissaoId, soDiretor }: { transmissaoId: string; soDiretor: boolean }) {
  const { localParticipant } = useLocalParticipant();
  const [mudando, setMudando] = useState(false);

  async function alternar() {
    setMudando(true);
    try {
      const novo = !soDiretor;
      // Só diretor: a câmera desliga antes, para nunca aparecer por engano.
      if (novo) await localParticipant.setCameraEnabled(false);
      await fetch("/api/participante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transmissaoId, alvo: localParticipant.identity, soDiretor: novo }),
      });
    } finally {
      setMudando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void alternar()}
      disabled={mudando}
      aria-pressed={soDiretor}
      title={
        soDiretor
          ? "Você está só dirigindo. Clique para poder aparecer na live."
          : "Clique para só dirigir, sem aparecer na live."
      }
      className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white/[0.06] px-3 text-sm font-medium ring-1 ring-white/10 ring-inset hover:bg-white/10 disabled:opacity-50"
    >
      <UserFocus weight="bold" className="size-4" aria-hidden />
      {soDiretor ? "Só diretor" : "Diretor e apresentador"}
    </button>
  );
}

/** "Mudo para a live" da própria pessoa: a equipe continua ouvindo. */
function BotaoMudoParaLive({ transmissaoId, codigo }: { transmissaoId: string; codigo?: string }) {
  const { localParticipant } = useLocalParticipant();
  const mudo = useMudoParaLive(localParticipant);
  const { alternar, pendente } = useAlternarMudoParaLive(transmissaoId, codigo);
  return (
    <BotaoBarra
      rotulo={mudo ? "Mudo p/ live" : "Ouvido na live"}
      ligado={!mudo}
      desativado={pendente !== null}
      onClick={() => void alternar(localParticipant.identity, !mudo)}
    >
      {mudo ? <IconeMudoLive weight="bold" /> : <SpeakerSimpleHigh weight="bold" />}
    </BotaoBarra>
  );
}

/** O navegador deixa compartilhar a tela? (No celular, quase nunca.) */
function suportaCompartilharTela() {
  return typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getDisplayMedia === "function";
}

/** Compartilhar a tela. Não vai ao ar sozinho: o diretor escolhe mostrar. */
function BotaoApresentar() {
  const { enabled, pending, toggle } = useTrackToggle({
    source: Track.Source.ScreenShare,
    // Áudio da aba quando o Chrome oferecer; "detail" mantém texto de slides nítido.
    captureOptions: { audio: true, selfBrowserSurface: "exclude", surfaceSwitching: "include", contentHint: "detail" },
  });
  if (!suportaCompartilharTela()) return null;
  return (
    <BotaoBarra
      rotulo={enabled ? "Parar" : "Apresentar"}
      ligado={enabled || undefined}
      desativado={pending}
      // Cancelar a escolha da tela não é erro.
      onClick={() => void Promise.resolve(toggle()).catch(() => undefined)}
    >
      <Monitor weight="bold" />
    </BotaoBarra>
  );
}

/** Convidado: avisa se a própria tela está só compartilhada ou já na live. */
function AvisoApresentando({ cena }: { cena: Cena }) {
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant();
  if (!isScreenShareEnabled) return null;
  const noAr = cena.apresentacaoId === localParticipant.identity;
  return (
    <p
      role="status"
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-inset ${
        noAr ? "bg-pronto/10 text-pronto ring-pronto/25" : "bg-white/[0.04] text-texto-suave ring-white/10"
      }`}
    >
      <Monitor weight="bold" className="size-5 shrink-0" aria-hidden />
      {noAr
        ? "Sua tela está na live."
        : "Você está compartilhando a tela. O diretor decide quando ela aparece na live."}
    </p>
  );
}

/** Espelhar a própria câmera: vale na tela de todos e na live. */
function BotaoEspelhar({ transmissaoId, codigo }: { transmissaoId: string; codigo?: string }) {
  const { localParticipant, isCameraEnabled } = useLocalParticipant();
  const espelhado = useEspelhado(localParticipant);
  const { alternar, pendente } = useAlternarEspelho(transmissaoId, codigo);
  if (!isCameraEnabled) return null;
  return (
    <BotaoBarra
      rotulo={espelhado ? "Espelhada" : "Espelhar"}
      ligado={espelhado}
      desativado={pendente !== null}
      onClick={() => void alternar(localParticipant.identity, !espelhado, true)}
    >
      <FlipHorizontal weight="bold" />
    </BotaoBarra>
  );
}

/** Para quem recebe o ponto: só essa pessoa tem permissão de assinar a faixa do diretor. */
function AvisoPontoRecebido() {
  const remotos = useRemoteParticipants();
  const ponto = remotos.find((p) => ehPonto(p.identity) && p.getTrackPublication(Track.Source.Microphone)?.isSubscribed);
  if (!ponto) return null;
  return <FaixaPonto participante={ponto} />;
}

function FaixaPonto({ participante }: { participante: Parameters<typeof useIsSpeaking>[0] }) {
  const falando = useIsSpeaking(participante);
  return (
    <div role="status" className="flex items-center justify-center gap-3 bg-destaque/15 px-4 py-2 text-sm font-semibold text-texto">
      <Headset weight="bold" className={`size-5 text-destaque ${falando ? "tally-pulso" : ""}`} aria-hidden />
      Diretor falando com você (só você ouve, não vai para a live)
    </div>
  );
}
