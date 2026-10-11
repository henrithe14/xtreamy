import "server-only";
import type { Privacidade } from "@/lib/supabase/tipos";

// Cliente mínimo da YouTube Data API v3 e do OAuth do Google, com fetch.
// Tokens do Google só existem no servidor (CLAUDE.md, seções 2 e 10.1).

const ESCOPO = "https://www.googleapis.com/auth/youtube";
const API = "https://www.googleapis.com/youtube/v3";

function credenciais() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new ErroYouTube("nao_configurado", "Login do Google não configurado no servidor.");
  return { clientId, clientSecret };
}

/** Erro com motivo legível para mostrar ao usuário. */
export class ErroYouTube extends Error {
  constructor(
    public motivo: string,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

const MENSAGENS: Record<string, string> = {
  liveStreamingNotEnabled:
    "Este canal ainda não pode fazer transmissões ao vivo. Ative em youtube.com/features (a liberação pode levar até 24 horas).",
  insufficientLivePermissions: "A conta conectada não tem permissão para transmitir neste canal.",
  quotaExceeded: "O limite diário de uso da API do YouTube acabou. Tente de novo amanhã.",
  invalid_grant: "A conexão com o YouTube expirou. Conecte o canal de novo em Destinos.",
};

async function lerErro(resposta: Response): Promise<ErroYouTube> {
  let motivo = `http_${resposta.status}`;
  try {
    const dados = (await resposta.json()) as {
      error?: string | { errors?: { reason?: string }[]; message?: string };
    };
    if (typeof dados.error === "string") motivo = dados.error;
    else if (dados.error?.errors?.[0]?.reason) motivo = dados.error.errors[0].reason;
  } catch {}
  return new ErroYouTube(motivo, MENSAGENS[motivo] ?? "O YouTube recusou o pedido. Tente de novo em instantes.");
}

// ---------- OAuth ----------

export function urlAutorizacao(state: string, redirectUri: string): string {
  const { clientId } = credenciais();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: ESCOPO,
    access_type: "offline",
    prompt: "consent", // garante refresh_token mesmo se já autorizou antes
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function pedirToken(corpo: Record<string, string>) {
  const { clientId, clientSecret } = credenciais();
  const resposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...corpo }),
    cache: "no-store",
  });
  if (!resposta.ok) throw await lerErro(resposta);
  return (await resposta.json()) as { access_token: string; refresh_token?: string; expires_in: number };
}

export async function trocarCodigo(codigo: string, redirectUri: string) {
  const tokens = await pedirToken({ code: codigo, redirect_uri: redirectUri, grant_type: "authorization_code" });
  if (!tokens.refresh_token) {
    throw new ErroYouTube("sem_refresh", "O Google não devolveu acesso permanente. Tente conectar de novo.");
  }
  return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
}

export async function obterAccessToken(refreshToken: string): Promise<string> {
  const tokens = await pedirToken({ refresh_token: refreshToken, grant_type: "refresh_token" });
  return tokens.access_token;
}

export async function revogar(token: string) {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(
    () => undefined,
  );
}

// ---------- Data API ----------

async function api<T>(accessToken: string, caminho: string, init: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${API}${caminho}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!resposta.ok) throw await lerErro(resposta);
  return resposta.status === 204 ? (undefined as T) : ((await resposta.json()) as T);
}

export async function canalDaConta(accessToken: string) {
  const dados = await api<{
    items?: { id: string; snippet: { title: string; thumbnails?: { default?: { url?: string } } } }[];
  }>(accessToken, "/channels?part=snippet&mine=true");
  const canal = dados.items?.[0];
  if (!canal) throw new ErroYouTube("sem_canal", "Esta conta Google não tem um canal do YouTube.");
  return { channelId: canal.id, nome: canal.snippet.title, avatarUrl: canal.snippet.thumbnails?.default?.url ?? null };
}

type DadosLive = {
  titulo: string;
  descricao: string;
  privacidade: Privacidade;
  inicioPrevisto: Date;
};

const PRIVACIDADE_YT: Record<Privacidade, "public" | "unlisted" | "private"> = {
  publica: "public",
  nao_listada: "unlisted",
  privada: "private",
};

/**
 * Cria no YouTube a live (broadcast) e o ponto de entrada de vídeo (stream), e liga
 * os dois. Sem início/fim automático: o Xtreamy controla isso (Etapa 6).
 */
export async function criarLive(accessToken: string, dados: DadosLive) {
  const broadcast = await api<{ id: string; snippet: { liveChatId?: string } }>(
    accessToken,
    "/liveBroadcasts?part=snippet,status,contentDetails",
    {
      method: "POST",
      body: JSON.stringify({
        snippet: {
          title: dados.titulo.slice(0, 100),
          description: dados.descricao.slice(0, 5000),
          scheduledStartTime: dados.inicioPrevisto.toISOString(),
        },
        status: { privacyStatus: PRIVACIDADE_YT[dados.privacidade], selfDeclaredMadeForKids: false },
        contentDetails: {
          enableAutoStart: false,
          enableAutoStop: false,
          latencyPreference: "low",
          monitorStream: { enableMonitorStream: false },
        },
      }),
    },
  );

  try {
    const stream = await api<{ id: string }>(accessToken, "/liveStreams?part=snippet,cdn,contentDetails", {
      method: "POST",
      body: JSON.stringify({
        snippet: { title: `Xtreamy · ${dados.titulo}`.slice(0, 128) },
        cdn: { ingestionType: "rtmp", resolution: "variable", frameRate: "variable" },
        contentDetails: { isReusable: false },
      }),
    });
    await api(accessToken, `/liveBroadcasts/bind?id=${broadcast.id}&part=id,contentDetails&streamId=${stream.id}`, {
      method: "POST",
    });
    return { broadcastId: broadcast.id, streamId: stream.id, liveChatId: broadcast.snippet.liveChatId ?? null };
  } catch (e) {
    // Não deixa uma live órfã no canal se a segunda parte falhar.
    await apagarLive(accessToken, broadcast.id, null);
    throw e;
  }
}

/** Apaga a live e o stream no YouTube (melhor esforço: ignora o que já não existe). */
export async function apagarLive(accessToken: string, broadcastId: string | null, streamId: string | null) {
  if (broadcastId) await api(accessToken, `/liveBroadcasts?id=${broadcastId}`, { method: "DELETE" }).catch(() => undefined);
  if (streamId) await api(accessToken, `/liveStreams?id=${streamId}`, { method: "DELETE" }).catch(() => undefined);
}

export function linkStudio(broadcastId: string) {
  return `https://studio.youtube.com/video/${broadcastId}/livestreaming`;
}
