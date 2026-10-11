import "server-only";
import {
  AccessToken,
  EgressClient,
  EncodingOptionsPreset,
  RoomServiceClient,
  StreamOutput,
  StreamProtocol,
} from "livekit-server-sdk";
import { nomeSala, type MetadadosParticipante } from "@/lib/participante";
import { lerCena, type Cena } from "@/lib/cena";

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

/** Cena atual da sala (lida dos metadata no servidor). */
export async function lerCenaDaSala(transmissaoId: string): Promise<Cena> {
  const [sala] = await clienteSala().listRooms([nomeSala(transmissaoId)]);
  return lerCena(sala?.metadata);
}

/** Muda só campos controlados pelo servidor (status, horário no ar), preservando o resto. */
export async function alterarCenaNoServidor(transmissaoId: string, mudanca: (c: Cena) => Partial<Cena>) {
  const atual = await lerCenaDaSala(transmissaoId);
  await gravarCenaNaSala(transmissaoId, { ...atual, ...mudanca(atual), versao: atual.versao + 1 });
}

function clienteEgress() {
  const { url, apiKey, apiSecret } = lerEnvLivekit();
  return new EgressClient(url, apiKey, apiSecret);
}

/**
 * Liga o Egress: o LiveKit abre o /stage (nosso template) num Chrome na nuvem,
 * captura em 1080p30 e envia por RTMP. Custa por minuto enquanto roda.
 */
export async function iniciarEgress(transmissaoId: string, rtmp: string): Promise<string> {
  const base = (process.env.APP_BASE_URL ?? "").replace(/\/+$/, "");
  if (!base.startsWith("https://")) {
    throw new Error("APP_BASE_URL precisa ser o endereço público https (o Egress roda na nuvem).");
  }
  const info = await clienteEgress().startRoomCompositeEgress(
    nomeSala(transmissaoId),
    new StreamOutput({ protocol: StreamProtocol.RTMP, urls: [rtmp] }),
    { customBaseUrl: `${base}/stage`, encodingOptions: EncodingOptionsPreset.H264_1080P_30 },
  );
  return info.egressId;
}

export async function pararEgress(egressId: string) {
  await clienteEgress().stopEgress(egressId);
}

export async function removerDaSala(transmissaoId: string, identity: string) {
  await clienteSala().removeParticipant(nomeSala(transmissaoId), identity);
}
