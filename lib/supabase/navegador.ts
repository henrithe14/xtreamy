import { createBrowserClient } from "@supabase/ssr";
import { exigirEnvPublico } from "@/lib/env";
import type { Database } from "@/lib/supabase/tipos";

/** Cliente Supabase para Client Components. Usa só a chave pública, protegida por RLS. */
export function criarClienteNavegador() {
  const { supabaseUrl, supabaseAnonKey } = exigirEnvPublico();
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
