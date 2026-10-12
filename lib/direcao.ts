import "server-only";
import { cookies } from "next/headers";
import { resolverAcesso } from "@/lib/acesso";
import { obterParticipante } from "@/lib/livekit";
import { ATRIBUTO_DIRETOR } from "@/lib/participante";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { obterTransmissaoDoUsuario, type Transmissao } from "@/lib/transmissoes";

/**
 * Quem pode dirigir a transmissão (seção 15, "diretor delegado"):
 * - dono: o criador logado (sem código de convite);
 * - delegado: um convidado que o dono marcou como diretor durante a sessão (atributo
 *   `diretor` na sala, gravado só pelo servidor a pedido do dono).
 * O delegado age com a autoridade do dono (cena, live, chat, pessoas), mas não pode
 * delegar a outros, trocar o convite nem enviar arquivos para a biblioteca do dono.
 */
export type Direcao = {
  tipo: "dono" | "delegado";
  /** Identity de quem pede, na sala. */
  identity: string;
  /** Dono da transmissão: tokens do YouTube e biblioteca vêm dele. */
  donoId: string;
  transmissao: Transmissao;
};

export async function obterDirecao(transmissaoId: string, codigo?: string): Promise<Direcao | null> {
  const acesso = await resolverAcesso(transmissaoId, codigo);
  if (!acesso) return null;

  if (acesso.papel === "host" && acesso.userId) {
    const transmissao = await obterTransmissaoDoUsuario(transmissaoId);
    return transmissao ? { tipo: "dono", identity: `host-${acesso.userId}`, donoId: acesso.userId, transmissao } : null;
  }

  // Convidado (código válido): só dirige se o dono marcou a identity dele.
  const identity = (await cookies()).get(`estudio_id_${transmissaoId}`)?.value;
  if (!identity) return null;
  const participante = await obterParticipante(transmissaoId, identity).catch(() => null);
  if (participante?.attributes?.[ATRIBUTO_DIRETOR] !== "1") return null;

  const { data: transmissao } = await criarClienteAdmin().from("transmissoes").select("*").eq("id", transmissaoId).maybeSingle();
  return transmissao ? { tipo: "delegado", identity, donoId: transmissao.user_id, transmissao } : null;
}
