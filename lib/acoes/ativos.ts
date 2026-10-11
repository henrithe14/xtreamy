"use server";

import { exigirUsuario } from "@/lib/auth";
import { ACEITOS, BUCKET_ATIVOS, CATEGORIAS, LIMITE_ARQUIVO, urlPublica, type CategoriaMidia, type TipoAtivo } from "@/lib/ativos";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type Ativo = {
  id: string;
  tipo: TipoAtivo;
  nome: string;
  url: string;
  mime: string;
  categoria: CategoriaMidia | null;
  duracao: number | null;
};

const AVISO_SQL = "Os ativos ainda não estão disponíveis (falta rodar o SQL da Etapa 10 no Supabase).";
const TIPOS = Object.keys(ACEITOS) as TipoAtivo[];

export async function listarAtivos(): Promise<{ ativos?: Ativo[]; erro?: string }> {
  await exigirUsuario();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("ativos")
    .select("id, tipo, nome, caminho, mime, metadados")
    .order("criado_em", { ascending: false });
  if (error) return { erro: AVISO_SQL };
  return {
    ativos: data.map((a) => {
      const meta = (a.metadados ?? {}) as { categoria?: CategoriaMidia; duracao?: number };
      return {
        id: a.id,
        tipo: a.tipo,
        nome: a.nome,
        url: urlPublica(a.caminho),
        mime: a.mime,
        categoria: meta.categoria ?? null,
        duracao: typeof meta.duracao === "number" ? meta.duracao : null,
      };
    }),
  };
}

type NovoAtivo = {
  tipo: TipoAtivo;
  nome: string;
  caminho: string;
  mime: string;
  tamanho: number;
  categoria?: CategoriaMidia;
  duracao?: number;
};

/** Registra um arquivo que o navegador já enviou ao Storage (pasta do próprio usuário). */
export async function registrarAtivo(novo: NovoAtivo): Promise<{ erro?: string }> {
  const usuario = await exigirUsuario();
  if (!TIPOS.includes(novo.tipo)) return { erro: "Tipo de ativo inválido." };
  if (!novo.caminho.startsWith(`${usuario.id}/${novo.tipo}/`) || novo.caminho.includes("..")) {
    return { erro: "Arquivo fora da sua pasta." };
  }
  if (!ACEITOS[novo.tipo].includes(novo.mime)) return { erro: "Tipo de arquivo não aceito." };
  if (!(novo.tamanho > 0 && novo.tamanho <= LIMITE_ARQUIVO)) return { erro: "Arquivo grande demais (até 50 MB)." };

  const metadados: Record<string, string | number> = {};
  if (novo.tipo === "midia") {
    metadados.categoria = CATEGORIAS.some((c) => c.id === novo.categoria) ? (novo.categoria as string) : "outras";
  }
  if (typeof novo.duracao === "number" && Number.isFinite(novo.duracao) && novo.duracao > 0) {
    metadados.duracao = Math.round(novo.duracao * 10) / 10;
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("ativos").insert({
    tipo: novo.tipo,
    nome: novo.nome.trim().slice(0, 120) || "Sem nome",
    caminho: novo.caminho,
    mime: novo.mime,
    tamanho: novo.tamanho,
    metadados,
  });
  if (error) {
    // Não deixa arquivo órfão no Storage.
    await supabase.storage.from(BUCKET_ATIVOS).remove([novo.caminho]);
    return { erro: AVISO_SQL };
  }
  return {};
}

export async function excluirAtivo(id: string): Promise<{ erro?: string }> {
  await exigirUsuario();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("ativos").select("caminho").eq("id", id).maybeSingle();
  if (!data) return { erro: "Ativo não encontrado." };
  await supabase.storage.from(BUCKET_ATIVOS).remove([data.caminho]);
  const { error } = await supabase.from("ativos").delete().eq("id", id);
  return error ? { erro: "Não foi possível excluir." } : {};
}
