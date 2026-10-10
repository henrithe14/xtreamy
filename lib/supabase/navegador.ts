import { createBrowserClient } from "@supabase/ssr";
import { exigirEnvPublico } from "@/lib/env";

/** Cliente Supabase para Client Components. Usa só a chave pública (anon), protegida por RLS. */
export function criarClienteNavegador() {
  const { supabaseUrl, supabaseAnonKey } = exigirEnvPublico();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
