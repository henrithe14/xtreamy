// Repetidor do Xtreamy: recebe a live da janela de transmissão (WebSocket, pedaços WebM)
// e manda ao YouTube por RTMP com o ffmpeg. Roda numa máquina própria (ex.: Oracle Cloud
// Always Free), atrás do Caddy (HTTPS). Veja LEIAME.md.
//
// Protocolo: a primeira mensagem (texto) é o bilhete cifrado pelo Xtreamy com RELAY_SECRET
// ({ rtmp, exp }); depois, só pedaços binários do MediaRecorder.

import { createDecipheriv } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORTA = Number(process.env.PORTA ?? 8080);
const SEGREDO = Buffer.from(process.env.RELAY_SECRET ?? "", "base64");
const MAX_CONEXOES = Number(process.env.MAX_CONEXOES ?? 2);
// Qualidade enviada ao YouTube (a máquina gratuita aguenta 720p com folga).
const ALTURA = Number(process.env.ALTURA ?? 720);
const BITRATE = process.env.BITRATE ?? "4000k";

if (SEGREDO.length !== 32) {
  console.error("Defina RELAY_SECRET (32 bytes em base64, o mesmo da Vercel).");
  process.exit(1);
}

/** Abre o bilhete; devolve o endereço RTMP ou null se for inválido/vencido/não for do YouTube. */
function abrirBilhete(bilhete) {
  try {
    const dados = Buffer.from(bilhete, "base64url");
    const decifra = createDecipheriv("aes-256-gcm", SEGREDO, dados.subarray(0, 12));
    decifra.setAuthTag(dados.subarray(12, 28));
    const texto = Buffer.concat([decifra.update(dados.subarray(28)), decifra.final()]).toString("utf8");
    const { rtmp, exp } = JSON.parse(texto);
    if (typeof rtmp !== "string" || typeof exp !== "number" || Date.now() > exp) return null;
    const url = new URL(rtmp);
    if (!["rtmp:", "rtmps:"].includes(url.protocol) || !url.hostname.endsWith(".youtube.com")) return null;
    return rtmp;
  } catch {
    return null;
  }
}

function iniciarFfmpeg(rtmp) {
  // Reconverte sempre: quadro-chave a cada 2 s, 30 fps constantes e AAC (o que o YouTube pede),
  // não importa o que o navegador mandou (H.264, VP8 ou VP9).
  return spawn(
    "ffmpeg",
    [
      "-hide_banner", "-loglevel", "error",
      "-fflags", "+genpts",
      "-i", "pipe:0",
      "-vf", `scale=-2:${ALTURA}`,
      "-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
      "-b:v", BITRATE, "-maxrate", BITRATE, "-bufsize", "8000k",
      "-pix_fmt", "yuv420p", "-r", "30", "-g", "60", "-keyint_min", "60", "-sc_threshold", "0",
      "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-af", "aresample=async=1",
      "-f", "flv", rtmp,
    ],
    { stdio: ["pipe", "ignore", "pipe"] },
  );
}

const http = createServer((req, res) => {
  // Para conferir se o repetidor está no ar (abrir o endereço no navegador).
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Repetidor do Xtreamy no ar.\n");
});

const wss = new WebSocketServer({ server: http, maxPayload: 16 * 1024 * 1024 });
let conexoes = 0;

wss.on("connection", (ws) => {
  if (conexoes >= MAX_CONEXOES) {
    ws.send("O repetidor já está transmitindo o máximo de lives ao mesmo tempo.");
    ws.close();
    return;
  }
  conexoes++;
  let ffmpeg = null;
  const fim = setTimeout(() => ws.close(), 15_000); // sem bilhete em 15 s: fecha

  ws.on("message", (dado, binario) => {
    if (!ffmpeg) {
      clearTimeout(fim);
      const rtmp = binario ? null : abrirBilhete(dado.toString());
      if (!rtmp) {
        ws.send("Bilhete inválido ou vencido.");
        ws.close();
        return;
      }
      ffmpeg = iniciarFfmpeg(rtmp);
      console.log(new Date().toISOString(), "transmissão começou");
      ffmpeg.stderr.on("data", (linha) => console.error("[ffmpeg]", linha.toString().trim()));
      ffmpeg.stdin.on("error", () => undefined);
      ffmpeg.on("exit", (codigo) => {
        console.log(new Date().toISOString(), "ffmpeg saiu", codigo);
        if (ws.readyState === ws.OPEN) {
          ws.send("O envio ao YouTube parou. Reconectando…");
          ws.close();
        }
      });
      return;
    }
    if (binario) ffmpeg.stdin.write(dado);
  });

  ws.on("close", () => {
    clearTimeout(fim);
    conexoes--;
    if (!ffmpeg) return;
    const processo = ffmpeg;
    processo.stdin.end();
    // Dá um instante para esvaziar; depois encerra de vez.
    setTimeout(() => processo.kill("SIGKILL"), 5000).unref();
  });
});

http.listen(PORTA, "127.0.0.1", () => console.log(`Repetidor ouvindo em 127.0.0.1:${PORTA}`));
