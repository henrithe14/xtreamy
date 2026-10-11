"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LiveKitRoom, useAudioPlayback, useRoomContext } from "@livekit/components-react";
import type { RoomOptions } from "livekit-client";
import { useCena } from "@/hooks/useCena";
import { AudioPalco, Composicao } from "@/components/stage/Composicao";

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
  const opcoes = useMemo<RoomOptions>(() => ({ adaptiveStream: false, dynacast: false }), []);

  if (!conexao) return <Tela>Conectando…</Tela>;
  if ("erro" in conexao) return <Tela>{conexao.erro}</Tela>;

  return (
    <LiveKitRoom serverUrl={conexao.url} token={conexao.token} connect audio={false} video={false} options={opcoes}>
      <Saida />
    </LiveKitRoom>
  );
}

function Saida() {
  const cena = useCena();
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      {/* Ocupa a tela inteira em 1920×1080 (Egress) e encaixa em 16:9 numa aba comum. */}
      <div className="w-[min(100vw,calc(100vh*16/9))]">
        <Composicao cena={cena} />
      </div>
      <AudioPalco cena={cena} />
      <LiberarSom />
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
