"use server";

import { refresh } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { gerarCodigoConvite, LIMITES, PRIVACIDADES } from "@/lib/transmissoes";
import type { Privacidade } from "@/lib/supabase/tipos";

export type EstadoNovaTransmissao =
  | { tipo: "inicial" }
  | { tipo: "erro"; mensagem: string; campos: { titulo: string; descricao: string } }
  | { tipo: "criada"; id: string };

export async function criarTransmissao(
  _anterior: EstadoNovaTransmissao,
  formData: FormData,
): Promise<EstadoNovaTransmissao> {
  await exigirUsuario();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const privacidadeBruta = String(formData.get("privacidade") ?? "nao_listada");
  const campos = { titulo, descricao };

  if (!titulo) return { tipo: "erro", mensagem: "Dê um título à transmissão.", campos };
  if (titulo.length > LIMITES.titulo) {
    return { tipo: "erro", mensagem: `O título pode ter até ${LIMITES.titulo} caracteres.`, campos };
  }
  if (descricao.length > LIMITES.descricao) {
    return { tipo: "erro", mensagem: `A descrição pode ter até ${LIMITES.descricao} caracteres.`, campos };
  }
  const privacidade = PRIVACIDADES.find((p) => p === privacidadeBruta) ?? ("nao_listada" satisfies Privacidade);

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("transmissoes")
    .insert({ titulo, descricao, privacidade, codigo_convite: gerarCodigoConvite() })
    .select("id")
    .single();

  if (error) {
    return { tipo: "erro", mensagem: "Não foi possível salvar a transmissão. Tente de novo.", campos };
  }

  refresh();
  return { tipo: "criada", id: data.id };
}

export async function excluirTransmissao(id: string): Promise<{ erro?: string }> {
  await exigirUsuario();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("transmissoes").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir. Tente de novo." };
  refresh();
  return {};
}
