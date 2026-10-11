import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { lerEnvPublico } from "@/lib/env";

/**
 * Renova a sessão do Supabase a cada requisição (os tokens expiram) e devolve
 * se há um usuário logado. É só uma checagem otimista: a autorização de verdade
 * acontece no servidor (lib/auth.ts) e no RLS do banco.
 */
export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });
  const env = lerEnvPublico();
  if (!env) return { resposta, logado: false };

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGravar) {
        for (const { name, value } of cookiesParaGravar) request.cookies.set(name, value);
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of cookiesParaGravar) {
          resposta.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  return { resposta, logado: Boolean(data?.claims) };
}
