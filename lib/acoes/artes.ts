"use server";

import { exigirUsuario } from "@/lib/auth";
import { CORES_PADRAO, type CoresMarca } from "@/lib/cena";
import { LIMITE_BANNER, validarEstilo, type Banner, type Estilo } from "@/lib/estilo";
import { criarClienteServidor } from "@/lib/supabase/servidor";

// Banners e estilos salvos do diretor (reusáveis em qualquer transmissão).

const AVISO_SQL = "A lista salva ainda não está disponível (falta rodar o SQL da Etapa 9 no Supabase).";

export type BannerSalvo = Banner & { id: string };
export type EstiloSalvo = { id: string; nome: string; estilo: Estilo; cores: CoresMarca };

export async function listarBanners(): Promise<{ banners?: BannerSalvo[]; erro?: string }> {
  await exigirUsuario();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("banners").select("id, texto, estilo").order("criado_em", { ascending: false });
  if (error) return { erro: AVISO_SQL };
  return { banners: data };
}

export async function salvarBanner(banner: Banner): Promise<{ erro?: string }> {
  await exigirUsuario();
  const texto = banner.texto.trim();
  if (!texto || texto.length > LIMITE_BANNER) return { erro: `O banner precisa ter de 1 a ${LIMITE_BANNER} caracteres.` };
  if (banner.estilo !== "faixa" && banner.estilo !== "letreiro") return { erro: "Estilo de banner inválido." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("banners").insert({ texto, estilo: banner.estilo });
  return error ? { erro: AVISO_SQL } : {};
}

export async function excluirBanner(id: string): Promise<{ erro?: string }> {
  await exigirUsuario();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("banners").delete().eq("id", id);
  return error ? { erro: "Não foi possível excluir." } : {};
}

const HEX = /^#[0-9a-f]{6}$/i;

function lerDefinicao(dado: unknown): { estilo: Estilo; cores: CoresMarca } | null {
  if (!dado || typeof dado !== "object") return null;
  const d = dado as { estilo?: unknown; cores?: Partial<CoresMarca> };
  const estilo = d.estilo === undefined ? null : validarEstilo(d.estilo);
  if (!estilo) return null;
  const cores =
    d.cores && typeof d.cores.primaria === "string" && HEX.test(d.cores.primaria) && typeof d.cores.secundaria === "string" && HEX.test(d.cores.secundaria)
      ? { primaria: d.cores.primaria, secundaria: d.cores.secundaria }
      : CORES_PADRAO;
  return { estilo, cores };
}

export async function listarEstilos(): Promise<{ estilos?: EstiloSalvo[]; erro?: string }> {
  await exigirUsuario();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("estilos").select("id, nome, definicao").order("criado_em", { ascending: false });
  if (error) return { erro: AVISO_SQL };
  return {
    estilos: data.flatMap((e) => {
      const def = lerDefinicao(e.definicao);
      return def ? [{ id: e.id, nome: e.nome, ...def }] : [];
    }),
  };
}

export async function salvarEstilo(nome: string, estilo: Estilo, cores: CoresMarca): Promise<{ erro?: string }> {
  await exigirUsuario();
  const n = nome.trim();
  if (!n || n.length > 60) return { erro: "Dê um nome de até 60 caracteres." };
  const def = lerDefinicao({ estilo, cores });
  if (!def) return { erro: "Estilo inválido." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("estilos").insert({ nome: n, definicao: def });
  return error ? { erro: AVISO_SQL } : {};
}

export async function excluirEstilo(id: string): Promise<{ erro?: string }> {
  await exigirUsuario();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("estilos").delete().eq("id", id);
  return error ? { erro: "Não foi possível excluir." } : {};
}
