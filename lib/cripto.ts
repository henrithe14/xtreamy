import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM com a chave TOKEN_ENCRYPTION_KEY (32 bytes em base64).
// Formato salvo: base64(iv[12] + tag[16] + texto cifrado).

function chave(): Buffer {
  const bruta = process.env.TOKEN_ENCRYPTION_KEY;
  const k = bruta ? Buffer.from(bruta, "base64") : Buffer.alloc(0);
  if (k.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY ausente ou inválida (precisa de 32 bytes em base64).");
  return k;
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chave(), iv);
  const corpo = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  return Buffer.concat([iv, cifra.getAuthTag(), corpo]).toString("base64");
}

export function decifrar(salvo: string): string {
  const dados = Buffer.from(salvo, "base64");
  const decifra = createDecipheriv("aes-256-gcm", chave(), dados.subarray(0, 12));
  decifra.setAuthTag(dados.subarray(12, 28));
  return Buffer.concat([decifra.update(dados.subarray(28)), decifra.final()]).toString("utf8");
}
