// Variáveis públicas (NEXT_PUBLIC_*): podem ir ao navegador.
// Precisam ser lidas com o nome literal para o Next embutir o valor no bundle do cliente.

export type EnvPublico = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function lerEnvPublico(): EnvPublico | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { supabaseUrl, supabaseAnonKey };
}

export function exigirEnvPublico(): EnvPublico {
  const env = lerEnvPublico();
  if (!env) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local.",
    );
  }
  return env;
}
