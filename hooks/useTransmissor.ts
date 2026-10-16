"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { faixaDoMix, retomarMix } from "@/lib/mixGravacao";

// Transmissão pelo navegador: a janela da saída (/stage?transmitir=1) captura a si mesma
// com o som da live e envia, em pedaços, ao repetidor (relay/), que manda ao YouTube.
// Se a conexão cair, reconecta sozinha (o YouTube aguenta alguns segundos sem sinal).

export type EstadoTransmissor = "pronto" | "conectando" | "enviando" | "reconectando" | "parado" | "erro";

/** Mensagens entre a janela de transmissão e o estúdio que a abriu. */
export type MensagemTransmissao =
  | { tipo: "xtreamy-transmissao"; estado: EstadoTransmissor; erro?: string }
  | { tipo: "xtreamy-transmissao-parar" };

function formatoSuportado(): string {
  const opcoes = ["video/webm;codecs=h264,opus", "video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm"];
  return opcoes.find((o) => MediaRecorder.isTypeSupported(o)) ?? "video/webm";
}

type CropTargetEstatico = { fromElement: (el: Element) => Promise<unknown> };
type FaixaRecortavel = MediaStreamTrack & { cropTo?: (alvo: unknown) => Promise<void> };

function avisarEstudio(mensagem: MensagemTransmissao) {
  try {
    window.opener?.postMessage(mensagem, window.location.origin);
  } catch {
    // Estúdio fechado: segue transmitindo.
  }
}

/** Fila de envio acima disto = internet sem fôlego para a live. */
const LIMITE_FILA = 6 * 1024 * 1024;

export function useTransmissor(transmissaoId: string, codigo: string | undefined, alvo: React.RefObject<HTMLElement | null>) {
  const [estado, setEstado] = useState<EstadoTransmissor>("pronto");
  const [erro, setErro] = useState<string>();
  const fluxo = useRef<MediaStream | null>(null);
  const conexao = useRef<WebSocket | null>(null);
  const gravador = useRef<MediaRecorder | null>(null);
  const ligado = useRef(false);
  const tentativas = useRef(0);
  const espera = useRef<number | undefined>(undefined);
  const lenta = useRef(false);
  // Para reconectar de dentro da própria conexão (sem o callback chamar a si mesmo).
  const reconectar = useRef<() => void>(() => undefined);

  const mudar = useCallback((novo: EstadoTransmissor, mensagem?: string) => {
    setEstado(novo);
    setErro(mensagem);
    avisarEstudio({ tipo: "xtreamy-transmissao", estado: novo, erro: mensagem });
  }, []);

  const conectar = useCallback(async () => {
    if (!ligado.current || !fluxo.current) return;
    const tentarDeNovo = (mensagem: string) => {
      if (!ligado.current) return;
      mudar("reconectando", mensagem);
      const atraso = Math.min(10_000, 1000 * 2 ** tentativas.current);
      tentativas.current++;
      espera.current = window.setTimeout(() => reconectar.current(), atraso);
    };

    let dados: { relay?: string; bilhete?: string; erro?: string };
    try {
      const r = await fetch("/api/live/sinal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transmissaoId, codigo }),
      });
      dados = (await r.json()) as typeof dados;
      if (!r.ok || !dados.relay || !dados.bilhete) {
        // Sem permissão ou live encerrada: não adianta insistir.
        if (r.status === 403 || r.status === 404 || r.status === 409) {
          ligado.current = false;
          mudar("erro", dados.erro ?? "Não foi possível transmitir.");
          return;
        }
        tentarDeNovo(dados.erro ?? "Falha ao preparar o envio.");
        return;
      }
    } catch {
      tentarDeNovo("Sem conexão com o servidor.");
      return;
    }

    const ws = new WebSocket(dados.relay);
    conexao.current = ws;
    const bilhete = dados.bilhete;
    ws.onopen = () => {
      if (!fluxo.current) return;
      ws.send(bilhete);
      const rec = new MediaRecorder(fluxo.current, {
        mimeType: formatoSuportado(),
        videoBitsPerSecond: 4_500_000,
        audioBitsPerSecond: 160_000,
        // Chrome: quadro-chave a cada 2 s (o YouTube pede no máximo 4 s).
        videoKeyFrameIntervalDuration: 2000,
      } as MediaRecorderOptions);
      gravador.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size === 0 || ws.readyState !== WebSocket.OPEN) return;
        const agoraLenta = ws.bufferedAmount > LIMITE_FILA;
        if (agoraLenta !== lenta.current) {
          lenta.current = agoraLenta;
          avisarEstudio({
            tipo: "xtreamy-transmissao",
            estado: "enviando",
            erro: agoraLenta ? "A internet do computador que transmite está lenta para a live." : undefined,
          });
        }
        ws.send(e.data);
      };
      rec.start(500);
      tentativas.current = 0;
      mudar("enviando");
    };
    ws.onmessage = (e) => {
      // O repetidor só fala para avisar um problema.
      if (typeof e.data === "string") setErro(e.data);
    };
    ws.onclose = () => {
      if (gravador.current?.state === "recording") gravador.current.stop();
      gravador.current = null;
      if (conexao.current === ws) conexao.current = null;
      if (ligado.current) tentarDeNovo("A conexão com o repetidor caiu. Reconectando…");
    };
  }, [transmissaoId, codigo, mudar]);
  useEffect(() => {
    reconectar.current = () => void conectar();
  }, [conectar]);

  const parar = useCallback(() => {
    ligado.current = false;
    window.clearTimeout(espera.current);
    if (gravador.current?.state === "recording") gravador.current.stop();
    conexao.current?.close();
    fluxo.current?.getVideoTracks().forEach((t) => t.stop());
    fluxo.current = null;
    mudar("parado");
  }, [mudar]);

  // O estúdio pede para parar (ao encerrar a live).
  useEffect(() => {
    const aoReceber = (e: MessageEvent<MensagemTransmissao>) => {
      if (e.origin === window.location.origin && e.data?.tipo === "xtreamy-transmissao-parar") parar();
    };
    window.addEventListener("message", aoReceber);
    return () => window.removeEventListener("message", aoReceber);
  }, [parar]);

  // Fechar a janela no meio derruba a live: pede confirmação.
  useEffect(() => {
    if (estado !== "enviando" && estado !== "reconectando") return;
    const aoSair = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aoSair);
    return () => window.removeEventListener("beforeunload", aoSair);
  }, [estado]);

  const comecar = useCallback(async () => {
    setErro(undefined);
    await retomarMix();
    const somDaLive = faixaDoMix();
    let captura: MediaStream;
    try {
      captura = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser", frameRate: 30 },
        audio: !somDaLive,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
        systemAudio: "exclude",
      } as DisplayMediaStreamOptions);
    } catch {
      setErro("A transmissão precisa da permissão para capturar esta aba.");
      return;
    }
    if (somDaLive) captura.addTrack(somDaLive);

    // Recorta no quadro 16:9 (Chrome), sem as faixas pretas da janela.
    const video = captura.getVideoTracks()[0] as FaixaRecortavel;
    const Crop = (window as unknown as { CropTarget?: CropTargetEstatico }).CropTarget;
    if (Crop && video.cropTo && alvo.current) {
      try {
        await video.cropTo(await Crop.fromElement(alvo.current));
      } catch {
        // Sem recorte: envia a aba inteira.
      }
    }
    // "Parar de compartilhar" do navegador também para a transmissão.
    video.addEventListener("ended", parar);

    fluxo.current = captura;
    ligado.current = true;
    tentativas.current = 0;
    mudar("conectando");
    void conectar();
  }, [alvo, conectar, mudar, parar]);

  return { estado, erro, comecar, parar };
}
