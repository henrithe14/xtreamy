"use client";

import { useEffect, useMemo, useState } from "react";
import { conectarFaixa } from "@/lib/mixGravacao";
import {
  AudioTrack,
  useIsMuted,
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
import { obterLayout, slotsGrade, type Slot } from "@/lib/layouts";
import { ATRIBUTO_AUDIO_PRIVADO, ATRIBUTO_ESPELHAR, lerMetadados } from "@/lib/participante";
import { CartaoSoVoz } from "@/components/ui/CartaoSoVoz";
import { MicrophoneSlash, SpeakerSimpleSlash, VideoCameraSlash } from "@phosphor-icons/react";

/**
 * Palco de fato: está em noPalco, está na sala e não é "só diretor".
 * - `visiveis`: aparecem no vídeo (sem câmera oculta e cabendo no layout).
 * - `ouvidos`: vão para o áudio da live (os visíveis + quem está com a câmera oculta).
 * Quem não está em nenhuma das listas não é visto nem ouvido (garantia do bastidor).
 */
function usePalco(cena: Cena) {
  const participantes = useParticipants();
  return useMemo(() => {
    const porIdentity = new Map(participantes.map((p) => [p.identity, p]));
    const presentes = cena.noPalco
      .map((id) => porIdentity.get(id))
      .filter((p) => p !== undefined)
      .filter((p) => !lerMetadados(p.metadata).soDiretor);
    const ocultos = new Set(cena.camerasOcultas);
    const visiveis = presentes.filter((p) => !ocultos.has(p.identity)).slice(0, obterLayout(cena.layoutId).maxPessoas);
    const ouvidos = [...visiveis, ...presentes.filter((p) => ocultos.has(p.identity))];
    return { visiveis, ouvidos };
  }, [participantes, cena.noPalco, cena.layoutId, cena.camerasOcultas]);
}

/** Quem aparece no vídeo da live, na ordem dos slots. */
export function usePalcoVisivel(cena: Cena) {
  return usePalco(cena).visiveis;
}

/** Quem é ouvido na live (inclui "câmera oculta"; o "mudo para a live" é tratado na faixa). */
export function usePalcoOuvido(cena: Cena) {
  return usePalco(cena).ouvidos;
}

/**
 * Tela compartilhada que está no ar: escolhida pelo diretor (apresentacaoId), sendo
 * compartilhada agora e com um layout de apresentação. Senão, undefined.
 */
export function useTelaNaLive(cena: Cena): TrackReference | undefined {
  const telas = useTracks([Track.Source.ScreenShare], { onlySubscribed: false });
  if (!cena.apresentacaoId || !obterLayout(cena.layoutId).apresentacao) return undefined;
  return telas.find((t) => t.participant.identity === cena.apresentacaoId && !t.publication.isMuted);
}

type Props = {
  cena: Cena;
  /** Prévia no estúdio: mostra aviso quando o palco está vazio. No /stage, nada. */
  previa?: boolean;
  /** Som de mídias e vinhetas: só no /stage (a live). Na prévia o vídeo fica mudo. */
  comSom?: boolean;
  /** Chamado quando a vinheta acaba (o diretor tira a vinheta da cena). */
  aoTerminarVinheta?: () => void;
  /** Só na prévia: botão em cima da câmera de cada pessoa (ex.: recado). Nunca na live. */
  acaoPessoa?: (participante: Participant) => React.ReactNode;
};

/** Por quanto tempo a tela "Transmissão encerrada" aparece antes de voltar ao estúdio normal. */
const TELA_ENCERRADA_MS = 12_000;

/**
 * Depois de encerrar, a tela de encerramento fica só um tempo; depois a prévia volta ao
 * normal e a equipe continua conversando (pós-live, como uma reunião que segue).
 */
function useMostrandoEncerramento(cena: Cena): boolean {
  const fimDaTela = cena.status === "encerrada" && cena.encerradaEm ? cena.encerradaEm + TELA_ENCERRADA_MS : 0;
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!fimDaTela) return;
    const falta = fimDaTela - Date.now();
    if (falta <= 0) return;
    const t = window.setTimeout(() => setAgora(Date.now()), falta + 50);
    return () => window.clearTimeout(t);
  }, [fimDaTela]);
  return fimDaTela > 0 && agora < fimDaTela;
}

/** Quadro 16:9 da live. Tamanhos de texto em cqw: escala igual na prévia e em 1920×1080. */
export function Composicao({ cena, previa = false, comSom = false, aoTerminarVinheta, acaoPessoa }: Props) {
  const palco = usePalcoVisivel(cena);
  const layout = obterLayout(cena.layoutId);
  const tela = useTelaNaLive(cena);
  // Layout de apresentação sem tela no ar: as pessoas ficam em grade.
  const slots = layout.apresentacao && !tela ? slotsGrade(palco.length) : layout.slots(palco.length, cena.tamanhoSolo);
  const slotTela = tela && layout.apresentacao ? layout.apresentacao(palco.length) : undefined;
  const cameras = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const encerramento = useMostrandoEncerramento(cena);

  return (
    <div
      className="@container relative aspect-video w-full overflow-hidden bg-[#070b16]"
      style={{ fontFamily: `"${cena.estilo.fonte}", ui-sans-serif, system-ui, sans-serif` }}
    >
      {/* Fonte das artes (Google Fonts). O React coloca o <link> no <head>. */}
      <link rel="stylesheet" href={urlFonte(cena.estilo.fonte)} precedence="default" />
      {/* Camadas de baixo para cima (seção 8.4). */}
      {cena.fundo ? <FundoEnviado fundo={cena.fundo} /> : <FundoMarca cores={cena.cores} />}

      {tela && slotTela && <SlotTela tela={tela} slot={slotTela} />}

      {/* "Só a tela" não tem slots de pessoa: quem está no palco só é ouvido. */}
      {palco.map(
        (p, i) =>
          slots[i] && (
            <SlotPessoa
              key={p.identity}
              participante={p}
              slot={slots[i]}
              camera={cameras.find((c) => c.participant.identity === p.identity)}
              estilo={cena.estilo}
              cores={cena.cores}
              mostrarEtiqueta={!cena.etiquetasOcultas.includes(p.identity)}
              previa={previa}
              acao={previa ? acaoPessoa?.(p) : undefined}
            />
          ),
      )}

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
      {((cena.status === "intervalo" && !cena.midia) || encerramento) && (
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

      {previa && palco.length === 0 && !tela && !cena.midia && cena.status !== "intervalo" && !encerramento && (
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
 * Tela compartilhada: nunca cortada nem esticada. Aparece inteira, na proporção real,
 * centralizada no slot; o fundo da live aparece nas sobras (seção 8.3).
 */
function SlotTela({ tela, slot }: { tela: TrackReference; slot: Slot }) {
  return (
    <div
      className="absolute transition-[left,top,width,height] duration-300 ease-out motion-reduce:transition-none"
      style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.w}%`, height: `${slot.h}%` }}
    >
      <VideoTrack trackRef={tela} className="size-full object-contain" />
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
  /** Prévia do estúdio: mostra o estado da pessoa ao lado do nome (nunca na live). */
  previa: boolean;
  acao?: React.ReactNode;
};

function SlotPessoa({ participante, slot, camera, estilo, cores, mostrarEtiqueta, previa, acao }: PropsSlot) {
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

      {(mostrarEtiqueta || previa) && (
        <div
          className={`absolute bottom-[5%] flex max-w-[90%] items-end gap-[0.5cqw] ${circulo ? "left-1/2 -translate-x-1/2" : "left-[3%]"}`}
        >
          {mostrarEtiqueta && <EtiquetaNome nome={nome} etiqueta={etiqueta} tema={estilo.tema} cores={cores} />}
          {previa && <EstadoNaPrevia participante={participante} comVideo={comVideo} />}
        </div>
      )}
      {acao && <div className="absolute top-[4%] right-[3%] z-10">{acao}</div>}
    </div>
  );
}

/**
 * Só na prévia do estúdio: microfone desligado, câmera desligada e "mudo para a live",
 * ao lado do nome. O /stage nunca mostra (não vai ao ar).
 */
function EstadoNaPrevia({ participante, comVideo }: { participante: Participant; comVideo: boolean }) {
  const micMudo = useIsMuted({ participant: participante, source: Track.Source.Microphone });
  const mudoParaLive = useParticipantAttribute(ATRIBUTO_AUDIO_PRIVADO, { participant: participante }) === "1";
  const itens = [
    micMudo && { Icone: MicrophoneSlash, rotulo: "Microfone desligado", cor: "text-no-ar" },
    !comVideo && { Icone: VideoCameraSlash, rotulo: "Câmera desligada", cor: "text-texto-suave" },
    mudoParaLive && { Icone: SpeakerSimpleSlash, rotulo: "Mudo para a live", cor: "text-ensaio" },
  ].filter((i) => i !== false);
  if (itens.length === 0) return null;
  return (
    <span className="flex shrink-0 gap-[0.3cqw]">
      {itens.map(({ Icone, rotulo, cor }) => (
        <span
          key={rotulo}
          title={rotulo}
          className={`flex size-[2.2cqw] min-h-5 min-w-5 items-center justify-center rounded-[0.4cqw] bg-black/70 ring-1 ring-white/15 backdrop-blur-sm ${cor}`}
        >
          <Icone weight="bold" className="size-[60%]" aria-label={rotulo} />
        </span>
      ))}
    </span>
  );
}

/**
 * Só no /stage: toca o microfone de quem está visível no palco, e de mais ninguém.
 * No intervalo e depois de encerrada, ninguém é ouvido na live. Quem está "mudo para a
 * live" também não. O ponto do diretor nunca é tocado (e o /stage nem tem permissão de ouvi-lo).
 */
/**
 * O que toca na caixa de som de quem abriu a saída:
 * - "tudo": Egress (a live) e "Ouvir a live" no estúdio.
 * - "sem-diretor": aba "Abrir saída" no computador do diretor (a própria voz daria eco).
 * - "nada": janela de gravação (o som vai só para o arquivo).
 */
export type SaidaLocal = "tudo" | "sem-diretor" | "nada";

export function AudioPalco({ cena, saida = "tudo" }: { cena: Cena; saida?: SaidaLocal }) {
  const palco = usePalcoOuvido(cena);
  const microfones = useTracks([Track.Source.Microphone]);
  const audiosTela = useTracks([Track.Source.ScreenShareAudio]);
  const tela = useTelaNaLive(cena);
  const silencio = cena.status === "intervalo" || cena.status === "encerrada";
  const visiveis = new Set(silencio ? [] : palco.map((p) => p.identity));
  // Som da aba/tela compartilhada: só enquanto a tela está no ar.
  const audioTela =
    tela && !silencio ? audiosTela.find((a) => a.participant.identity === tela.participant.identity && !a.participant.isLocal) : undefined;
  return (
    <>
      {audioTela && <FaixaNaLive key="tela" trackRef={audioTela} tocar={saida !== "nada"} />}
      {microfones
        // A própria voz nunca volta (no estúdio, com "Ouvir a live" ligado).
        .filter((m) => visiveis.has(m.participant.identity) && !m.participant.isLocal)
        .map((m) => (
          <AudioSeNaoPrivado
            key={m.participant.identity}
            trackRef={m}
            tocar={saida === "tudo" || (saida === "sem-diretor" && lerMetadados(m.participant.metadata).papel !== "host")}
          />
        ))}
    </>
  );
}

/** "Mudo para a live": reage ao atributo na hora; o vídeo continua, a voz não vai ao ar. */
function AudioSeNaoPrivado({ trackRef, tocar }: { trackRef: TrackReference; tocar: boolean }) {
  const privado = useParticipantAttribute(ATRIBUTO_AUDIO_PRIVADO, { participant: trackRef.participant }) === "1";
  return privado ? null : <FaixaNaLive trackRef={trackRef} tocar={tocar} />;
}

/** Toca a faixa (ou só assina, mudo) e, na janela de gravação, soma na mixagem do arquivo. */
function FaixaNaLive({ trackRef, tocar }: { trackRef: TrackReference; tocar: boolean }) {
  const faixa = trackRef.publication.track?.mediaStreamTrack;
  useEffect(() => (faixa ? conectarFaixa(faixa) : undefined), [faixa]);
  return <AudioTrack trackRef={trackRef} muted={!tocar} />;
}
