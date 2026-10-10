import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { exigirEnvPublico } from "@/lib/env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Age em nome do usuário logado (sessão nos cookies), então continua sujeito ao RLS.
 */
export async function criarClienteServidor() {
  const { supabaseUrl, supabaseAnonKey } = exigirEnvPublico();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
          // Server Components não podem gravar cookies; a renovação da sessão
          // será feita no proxy (Etapa 1).
        }
      },
    },
  });
}
