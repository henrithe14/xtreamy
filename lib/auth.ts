import "server-only";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type Usuario = { id: string; email: string };

/** Usuário logado (JWT verificado), ou null. Lê cookies: use dentro de <Suspense>. */
export async function obterUsuario(): Promise<Usuario | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
}

/** Como obterUsuario, mas manda para /login quando não há sessão. */
export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await obterUsuario();
  if (!usuario) redirect("/login");
  return usuario;
}
