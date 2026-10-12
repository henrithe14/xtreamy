"use server";

import { exigirUsuario } from "@/lib/auth";
import { LIMITE_ROTEIRO } from "@/lib/teleprompter";
import { criarClienteServidor } from "@/lib/supabase/servidor";

// Roteiros do teleprompter, salvos pelo criador (o diretor delegado usa sem salvar).

const AVISO_SQL = "Os roteiros salvos ainda não estão disponíveis (falta rodar o SQL da Etapa 13 no Supabase).";

export type Roteiro = { id: string; titulo: string; texto: string };

export async function listarRoteiros(): Promise<{ roteiros?: Roteiro[]; erro?: string }> {
  await exigirUsuario();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("roteiros").select("id, titulo, texto").order("criado_em", { ascending: false });
  return error ? { erro: AVISO_SQL } : { roteiros: data };
}

export async function salvarRoteiro(titulo: string, texto: string): Promise<{ erro?: string }> {
  await exigirUsuario();
  const t = titulo.trim().slice(0, LIMITE_ROTEIRO.titulo) || "Sem título";
  const x = texto.trim();
  if (!x || x.length > LIMITE_ROTEIRO.texto) return { erro: `O roteiro precisa ter de 1 a ${LIMITE_ROTEIRO.texto} caracteres.` };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("roteiros").insert({ titulo: t, texto: x });
  return error ? { erro: AVISO_SQL } : {};
}

export async function excluirRoteiro(id: string): Promise<{ erro?: string }> {
  await exigirUsuario();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("roteiros").delete().eq("id", id);
  return error ? { erro: "Não foi possível excluir." } : {};
}
