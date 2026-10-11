import "server-only";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { nomeSala, type MetadadosParticipante } from "@/lib/participante";
import type { Cena } from "@/lib/cena";

function lerEnvLivekit() {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) {
    throw new Error("LiveKit não configurado: defina LIVEKIT_URL, LIVEKIT_API_KEY e LIVEKIT_API_SECRET.");
  }
  return { url, apiKey, apiSecret };
}

type DadosToken = {
  transmissaoId: string;
  identity: string;
  nome: string;
  metadados: MetadadosParticipante;
};

/**
 * Token de entrada na sala. Expira rápido (só vale para conectar; depois o LiveKit
 * renova a sessão sozinho). Nome e etiqueta vão em name/metadata, nunca na identity.
 */
export async function criarTokenParticipante({ transmissaoId, identity, nome, metadados }: DadosToken) {
  const { apiKey, apiSecret } = lerEnvLivekit();
  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: nome,
    metadata: JSON.stringify(metadados),
    ttl: "10m",
  });
  token.addGrant({
    room: nomeSala(transmissaoId),
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: false,
  });
  return token.toJwt();
}

function clienteSala() {
  const { url, apiKey, apiSecret } = lerEnvLivekit();
  return new RoomServiceClient(url, apiKey, apiSecret);
}

/**
 * Token do /stage: participante oculto que só assina faixas e nunca publica.
 * Usado pela aba de saída que o diretor abre (o Egress gera o próprio token).
 */
export async function criarTokenStage(transmissaoId: string) {
  const { apiKey, apiSecret } = lerEnvLivekit();
  const token = new AccessToken(apiKey, apiSecret, {
    identity: `stage-${crypto.randomUUID().slice(0, 8)}`,
    name: "Saída da live",
    ttl: "10m",
  });
  token.addGrant({
    room: nomeSala(transmissaoId),
    roomJoin: true,
    canPublish: false,
    canPublishData: false,
    canSubscribe: true,
    hidden: true,
  });
  return token.toJwt();
}

export async function gravarCenaNaSala(transmissaoId: string, cena: Cena) {
  await clienteSala().updateRoomMetadata(nomeSala(transmissaoId), JSON.stringify(cena));
}

export async function removerDaSala(transmissaoId: string, identity: string) {
  await clienteSala().removeParticipant(nomeSala(transmissaoId), identity);
}
