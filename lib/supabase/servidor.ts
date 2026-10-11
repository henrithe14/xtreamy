import "server-only";
import { cookies } from "next/headers";
import { io } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { exigirEnvPublico } from "@/lib/env";
import type { Database } from "@/lib/supabase/tipos";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Age em nome do usuário logado (sessão nos cookies), então continua sujeito ao RLS.
 */
export async function criarClienteServidor() {
  const { supabaseUrl, supabaseAnonKey } = exigirEnvPublico();
  const cookieStore = await cookies();
  // A sessão é validada com o relógio (expiração do token): nunca pode entrar no
  // prerender nem na pré-busca. io() adia esse trecho para a hora da requisição.
  await io();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaGravar) {
        try {
          for (const { name, value, options } of cookiesParaGravar) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components não podem gravar cookies; o proxy renova a sessão.
        }
      },
    },
  });
}
