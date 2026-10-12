"use server";

import { resolverAcesso } from "@/lib/acesso";
import { obterDirecao } from "@/lib/direcao";
import { removerDaSala } from "@/lib/livekit";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { gerarCodigoConvite, urlConvite } from "@/lib/transmissoes";

/** Só o dono logado da transmissão (host) pode usar estas ações. */
async function exigirHost(transmissaoId: string) {
  const acesso = await resolverAcesso(transmissaoId, undefined);
  if (acesso?.papel !== "host") throw new Error("Apenas o diretor pode fazer isso.");
}

export async function removerParticipante(transmissaoId: string, identity: string, codigo?: string): Promise<{ erro?: string }> {
  const direcao = await obterDirecao(transmissaoId, codigo);
  if (!direcao) return { erro: "Apenas o diretor pode remover pessoas." };
  // O delegado não remove o dono.
  if (direcao.tipo === "delegado" && identity.startsWith("host-")) return { erro: "Só o dono pode fazer isso." };
  try {
    await removerDaSala(transmissaoId, identity);
    return {};
  } catch {
    return { erro: "Não foi possível remover. Tente de novo." };
  }
}

/** Troca o código do convite: o link antigo para de funcionar para quem ainda não entrou. */
export async function gerarNovoConvite(transmissaoId: string): Promise<{ url?: string; erro?: string }> {
  await exigirHost(transmissaoId);
  const codigo_convite = gerarCodigoConvite();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("transmissoes").update({ codigo_convite }).eq("id", transmissaoId);
  if (error) return { erro: "Não foi possível gerar um novo link." };
  return { url: urlConvite({ id: transmissaoId, codigo_convite }) };
}
