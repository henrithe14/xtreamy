"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LiveKitRoom, useAudioPlayback, useConnectionState, useRoomContext } from "@livekit/components-react";
import EgressHelper from "@livekit/egress-sdk";
import { ConnectionState, type RoomOptions } from "livekit-client";
import { useCena } from "@/hooks/useCena";
import { Composicao } from "@/components/stage/Composicao";
import { AudioLive } from "@/components/stage/AudioLive";
import { Gravador } from "@/components/stage/Gravador";

type Conexao = { url: string; token: string } | { erro: string } | null;

export function PaginaStage() {
  const params = useSearchParams();
  const urlEgress = params.get("url");
  const tokenEgress = params.get("token");
  const transmissaoId = params.get("t");
  const [buscada, setBuscada] = useState<Conexao>(null);

  const conexao: Conexao =
    urlEgress && tokenEgress
      ? { url: urlEgress, token: tokenEgress }
      : !transmissaoId
        ? { erro: "Endereço incompleto." }
        : buscada;

  useEffect(() => {
    if ((urlEgress && tokenEgress) || !transmissaoId) return;
    let cancelado = false;
    void (async () => {
      try {
        const r = await fetch("/api/token/stage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transmissaoId }),
        });
        const dados = (await r.json()) as { token?: string; erro?: string };
        if (cancelado) return;
        const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
        setBuscada(dados.token && url ? { url, token: dados.token } : { erro: dados.erro ?? "Não foi possível abrir a saída." });
      } catch {
        if (!cancelado) setBuscada({ erro: "Sem conexão com o servidor." });
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [urlEgress, tokenEgress, transmissaoId]);

  // A saída quer sempre a melhor qualidade de quem está no palco.
  const modoEgress = Boolean(urlEgress && tokenEgress);
  // Janela de gravação aberta pelo diretor (grava esta aba no computador dele).
  const gravar = !modoEgress && params.get("gravar") === "1";
  const opcoes = useMemo<RoomOptions>(() => ({ adaptiveStream: false, dynacast: false }), []);

  if (!conexao) return <Tela>Conectando…</Tela>;
  if ("erro" in conexao) return <Tela>{conexao.erro}</Tela>;

  return (
    <LiveKitRoom serverUrl={conexao.url} token={conexao.token} connect audio={false} video={false} options={opcoes}>
      <Saida egress={modoEgress} gravar={gravar} />
    </LiveKitRoom>
  );
}

function Saida({ egress, gravar }: { egress: boolean; gravar: boolean }) {
  const cena = useCena();
  const room = useRoomContext();
  const quadro = useRef<HTMLDivElement>(null);
  const { startAudio } = useAudioPlayback(room);
  const conexao = useConnectionState();

  // No Egress: avisa que a página está pronta para gravar, já conectada e com a cena
  // carregada (um instante para os vídeos aparecerem e não começar com tela vazia).
  useEffect(() => {
    if (!egress || conexao !== ConnectionState.Connected) return;
    EgressHelper.setRoom(room);
    const t = window.setTimeout(() => EgressHelper.startRecording(), 1500);
    return () => window.clearTimeout(t);
  }, [egress, conexao, room]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      {/* Ocupa a tela inteira em 1920×1080 (Egress) e encaixa em 16:9 numa aba comum. */}
      <div ref={quadro} className="w-[min(100vw,calc(100vh*16/9))]">
        <Composicao cena={cena} comSom />
      </div>
      <AudioLive cena={cena} />
      {/* Nunca mostrar botão na imagem que vai ao ar. */}
      {!egress && !gravar && <LiberarSom />}
      {gravar && <Gravador alvo={quadro} aoComecar={() => void startAudio()} />}
    </div>
  );
}

/** Numa aba comum o navegador pode bloquear o som até um clique (o Egress não precisa). */
function LiberarSom() {
  const room = useRoomContext();
  const { canPlayAudio, startAudio } = useAudioPlayback(room);
  if (canPlayAudio) return null;
  return (
    <button
      type="button"
      onClick={() => void startAudio()}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-black/70 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur"
    >
      Clique para ouvir a live
    </button>
  );
}

function Tela({ children }: { children: React.ReactNode }) {
  return <main className="fixed inset-0 flex items-center justify-center bg-black text-sm text-white/70">{children}</main>;
}
