import { NextResponse, type NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

/** Rotas que exigem login (criador). Convidados usam só /t/[id]/entrar com código. */
const ROTAS_PRIVADAS = ["/"];

export async function proxy(request: NextRequest) {
  const { resposta, logado } = await atualizarSessao(request);
  const { pathname } = request.nextUrl;

  if (!logado && ROTAS_PRIVADAS.includes(pathname)) {
    return redirecionar(request, "/login", resposta);
  }
  if (logado && pathname === "/login") {
    return redirecionar(request, "/", resposta);
  }
  return resposta;
}

/** Redireciona preservando os cookies de sessão que acabaram de ser renovados. */
function redirecionar(request: NextRequest, destino: string, resposta: NextResponse) {
  const redirecionamento = NextResponse.redirect(new URL(destino, request.url));
  for (const cookie of resposta.cookies.getAll()) redirecionamento.cookies.set(cookie);
  return redirecionamento;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/saude|icon.svg|.*\.(?:png|jpg|jpeg|webp|svg|ico)$).*)"],
};
