import "server-only";
import { createClient } from "@supabase/supabase-js";
import { exigirEnvPublico } from "@/lib/env";
import type { Database } from "@/lib/supabase/tipos";

/**
 * Cliente com a chave de serviço: ignora o RLS. Usar SÓ no servidor e só onde o
 * usuário comum não pode agir (gravar/ler tokens do Google). Sempre conferir o
 * dono (user_id) nas consultas.
 */
export function criarClienteAdmin() {
  const { supabaseUrl } = exigirEnvPublico();
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  return createClient<Database>(supabaseUrl, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}
