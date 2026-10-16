import "server-only";
import { createCipheriv, randomBytes } from "node:crypto";

// Transmissão pelo navegador (sem Egress): a janela de transmissão do diretor envia o
// vídeo para o nosso repetidor (relay/), que converte e manda por RTMP ao YouTube.
// O endereço RTMP (com a chave) vai num "bilhete" cifrado com RELAY_SECRET, que só o
// repetidor abre: o navegador nunca vê a chave da live.

/** Com o repetidor configurado, "Iniciar" usa a janela de transmissão em vez do Egress. */
export function transmitePeloNavegador() {
  return Boolean(process.env.RELAY_URL && process.env.RELAY_SECRET);
}

function chave(): Buffer {
  const k = Buffer.from(process.env.RELAY_SECRET ?? "", "base64");
  if (k.length !== 32) throw new Error("RELAY_SECRET ausente ou inválida (precisa de 32 bytes em base64).");
  return k;
}

/** Bilhete válido por 5 minutos (o suficiente para conectar; reconectar pede outro). */
export function criarBilhete(rtmp: string): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chave(), iv);
  const texto = JSON.stringify({ rtmp, exp: Date.now() + 5 * 60_000 });
  const corpo = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  return Buffer.concat([iv, cifra.getAuthTag(), corpo]).toString("base64url");
}

export function enderecoRelay(): string {
  return process.env.RELAY_URL ?? "";
}
