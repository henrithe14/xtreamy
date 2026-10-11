import "server-only";
import { cifrar, decifrar } from "@/lib/cripto";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { LinhaDestino } from "@/lib/supabase/tipos";
import { ErroYouTube, obterAccessToken } from "@/lib/youtube";

export type Destino = LinhaDestino;

const COLUNAS = "id, user_id, tipo, channel_id, nome_canal, avatar_url, criado_em";

/** Destinos do usuário logado (RLS + permissão por coluna: sem o token). */
export async function listarDestinos(): Promise<Destino[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("destinos").select(COLUNAS).order("criado_em");
  if (error) throw new Error(`Falha ao listar destinos: ${error.message}`);
  return data;
}

/** Conecta (ou reconecta) um canal: grava o refresh token criptografado. */
export async function salvarDestino(dados: {
  userId: string;
  channelId: string;
  nome: string;
  avatarUrl: string | null;
  refreshToken: string;
}) {
  const admin = criarClienteAdmin();
  const { error } = await admin.from("destinos").upsert(
    {
      user_id: dados.userId,
      channel_id: dados.channelId,
      nome_canal: dados.nome,
      avatar_url: dados.avatarUrl,
      refresh_token_cifrado: cifrar(dados.refreshToken),
    },
    { onConflict: "user_id,channel_id" },
  );
  if (error) throw new Error(`Falha ao salvar destino: ${error.message}`);
}

/** Refresh token do destino, conferindo o dono. Só para uso no servidor. */
export async function refreshTokenDoDestino(destinoId: string, userId: string): Promise<string> {
  const admin = criarClienteAdmin();
  const { data } = await admin
    .from("destinos")
    .select("refresh_token_cifrado")
    .eq("id", destinoId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new ErroYouTube("sem_destino", "Canal não encontrado. Conecte de novo em Destinos.");
  return decifrar(data.refresh_token_cifrado);
}

/** Access token novo (vale ~1 hora) para falar com o YouTube em nome do canal. */
export async function accessTokenDoDestino(destinoId: string, userId: string): Promise<string> {
  return obterAccessToken(await refreshTokenDoDestino(destinoId, userId));
}
