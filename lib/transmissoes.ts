import "server-only";
import { randomBytes } from "node:crypto";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Database, Privacidade } from "@/lib/supabase/tipos";

export type Transmissao = Database["public"]["Tables"]["transmissoes"]["Row"];

export const LIMITES = { titulo: 100, descricao: 5000 } as const;
export const PRIVACIDADES: Privacidade[] = ["nao_listada", "publica", "privada"];

/** Código secreto do link de convite (144 bits, seguro para URL). */
export function gerarCodigoConvite() {
  return randomBytes(18).toString("base64url");
}

export function urlConvite(t: Pick<Transmissao, "id" | "codigo_convite">) {
  const base = (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/t/${t.id}/entrar?c=${encodeURIComponent(t.codigo_convite)}`;
}

/** Transmissões do usuário logado (o RLS garante que são só as dele). */
export async function listarTransmissoes(): Promise<Transmissao[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("transmissoes")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) throw new Error(`Falha ao listar transmissões: ${error.message}`);
  return data;
}

/** A transmissão, se o usuário logado for o dono; senão null. */
export async function obterTransmissaoDoUsuario(id: string): Promise<Transmissao | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("transmissoes").select("*").eq("id", id).maybeSingle();
  return data;
}

/** Título da transmissão se o código de convite for válido; senão null. */
export async function validarConvite(id: string, codigo: string): Promise<string | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("dados_convite", {
    p_transmissao: id,
    p_codigo: codigo,
  });
  if (error || !data?.length) return null;
  return data[0].titulo;
}
