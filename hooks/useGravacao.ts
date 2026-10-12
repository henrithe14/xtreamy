"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Gravação local (no navegador do diretor): captura a aba da saída (/stage) com o som
// da live e grava com MediaRecorder. No Chrome, salva direto num arquivo escolhido
// (bom para gravações longas); senão, junta na memória e baixa ao parar.

export type EstadoGravacao = "pronto" | "gravando" | "salvando" | "salvo" | "erro";

/** Mensagens entre a janela de gravação e o estúdio que a abriu. */
export type MensagemGravacao =
  | { tipo: "xtreamy-gravacao"; estado: EstadoGravacao; desde?: number }
  | { tipo: "xtreamy-gravacao-parar" };

type Gravavel = { mime: string; ext: "mp4" | "webm" };

function formatoSuportado(): Gravavel {
  const opcoes: Gravavel[] = [
    { mime: "video/mp4;codecs=avc1,mp4a.40.2", ext: "mp4" },
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
  ];
  return opcoes.find((o) => MediaRecorder.isTypeSupported(o.mime)) ?? { mime: "video/webm", ext: "webm" };
}

type Escrita = { write: (dado: Blob) => Promise<void>; close: () => Promise<void> };
type JanelaComArquivo = Window & {
  showSaveFilePicker?: (opcoes: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{ createWritable: () => Promise<Escrita> }>;
};
type CropTargetEstatico = { fromElement: (el: Element) => Promise<unknown> };
type FaixaRecortavel = MediaStreamTrack & { cropTo?: (alvo: unknown) => Promise<void> };

function nomeArquivo(ext: string) {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `xtreamy-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}h${p(d.getMinutes())}.${ext}`;
}

function avisarEstudio(mensagem: MensagemGravacao) {
  try {
    window.opener?.postMessage(mensagem, window.location.origin);
  } catch {
    // Estúdio fechado: segue gravando.
  }
}

/** `alvo`: elemento do quadro 16:9; no Chrome a captura é recortada nele. */
export function useGravacao(alvo: React.RefObject<HTMLElement | null>) {
  const [estado, setEstado] = useState<EstadoGravacao>("pronto");
  const [erro, setErro] = useState<string>();
  const [urlBaixar, setUrlBaixar] = useState<string>();
  const [nome, setNome] = useState<string>();
  const gravador = useRef<MediaRecorder | null>(null);

  const parar = useCallback(() => {
    if (gravador.current?.state === "recording") gravador.current.stop();
  }, []);

  // O estúdio pode pedir para parar.
  useEffect(() => {
    const aoReceber = (e: MessageEvent<MensagemGravacao>) => {
      if (e.origin === window.location.origin && e.data?.tipo === "xtreamy-gravacao-parar") parar();
    };
    window.addEventListener("message", aoReceber);
    return () => window.removeEventListener("message", aoReceber);
  }, [parar]);

  // Fechar a janela no meio: avisa (a gravação em memória se perderia).
  useEffect(() => {
    if (estado !== "gravando") return;
    const aoSair = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aoSair);
    return () => window.removeEventListener("beforeunload", aoSair);
  }, [estado]);

  const comecar = useCallback(async () => {
    setErro(undefined);
    const formato = formatoSuportado();
    const arquivo = nomeArquivo(formato.ext);
    setNome(arquivo);

    // 1) Onde salvar (Chrome): pedido antes da captura, ainda dentro do clique.
    let escrita: Escrita | null = null;
    const janela = window as JanelaComArquivo;
    if (janela.showSaveFilePicker) {
      try {
        const destino = await janela.showSaveFilePicker({
          suggestedName: arquivo,
          types: [{ description: "Vídeo", accept: { [formato.mime.split(";")[0]]: [`.${formato.ext}`] } }],
        });
        escrita = await destino.createWritable();
      } catch {
        return; // cancelou a escolha do arquivo
      }
    }

    // 2) Captura desta aba, com o som da live.
    let fluxo: MediaStream;
    try {
      fluxo = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser", frameRate: 30 },
        audio: true,
        // Opções do Chrome: já sugerir esta aba e manter o som tocando aqui.
        preferCurrentTab: true,
        selfBrowserSurface: "include",
        systemAudio: "exclude",
      } as DisplayMediaStreamOptions);
    } catch {
      await escrita?.close().catch(() => undefined);
      setErro("A gravação precisa da permissão para capturar esta aba.");
      return;
    }
    if (fluxo.getAudioTracks().length === 0) {
      setErro("Sem som: na próxima vez, marque “Compartilhar áudio da guia”. Gravando só o vídeo.");
    }

    // 3) Recorta no quadro 16:9 (Chrome), sem as faixas pretas da janela.
    const video = fluxo.getVideoTracks()[0] as FaixaRecortavel;
    const Crop = (window as unknown as { CropTarget?: CropTargetEstatico }).CropTarget;
    if (Crop && video.cropTo && alvo.current) {
      try {
        await video.cropTo(await Crop.fromElement(alvo.current));
      } catch {
        // Sem recorte: grava a aba inteira.
      }
    }

    const pedacos: Blob[] = [];
    let escrevendo = Promise.resolve();
    const rec = new MediaRecorder(fluxo, { mimeType: formato.mime, videoBitsPerSecond: 8_000_000 });
    gravador.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size === 0) return;
      if (escrita) {
        const parte = e.data;
        escrevendo = escrevendo.then(() => escrita.write(parte));
      } else pedacos.push(e.data);
    };
    rec.onstop = () => {
      fluxo.getTracks().forEach((t) => t.stop());
      setEstado("salvando");
      avisarEstudio({ tipo: "xtreamy-gravacao", estado: "salvando" });
      void (async () => {
        try {
          if (escrita) {
            await escrevendo;
            await escrita.close();
          } else {
            setUrlBaixar(URL.createObjectURL(new Blob(pedacos, { type: formato.mime.split(";")[0] })));
          }
          setEstado("salvo");
          avisarEstudio({ tipo: "xtreamy-gravacao", estado: "salvo" });
        } catch {
          setEstado("erro");
          setErro("Não foi possível salvar o arquivo. Verifique o espaço em disco.");
          avisarEstudio({ tipo: "xtreamy-gravacao", estado: "erro" });
        }
      })();
    };
    // "Parar de compartilhar" do navegador também encerra a gravação.
    video.addEventListener("ended", () => {
      if (rec.state === "recording") rec.stop();
    });

    rec.start(1000);
    const desde = Date.now();
    setEstado("gravando");
    avisarEstudio({ tipo: "xtreamy-gravacao", estado: "gravando", desde });
  }, [alvo]);

  return { estado, erro, urlBaixar, nome, comecar, parar };
}
