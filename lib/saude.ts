import "server-only";
import { lerEnvPublico } from "@/lib/env";

export type EstadoSupabase = "ok" | "nao_configurado" | "erro";

/** Confere se o Supabase responde com as chaves configuradas. */
export async function verificarSupabase(): Promise<EstadoSupabase> {
  const env = lerEnvPublico();
  if (!env) return "nao_configurado";

  try {
    const resposta = await fetch(`${env.supabaseUrl}/auth/v1/health`, {
      headers: { apikey: env.supabaseAnonKey },
      signal: AbortSignal.timeout(5000),
    });
    return resposta.ok ? "ok" : "erro";
  } catch {
    return "erro";
  }
}
