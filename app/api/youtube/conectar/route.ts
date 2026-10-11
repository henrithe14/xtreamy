import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { obterUsuario } from "@/lib/auth";
import { urlAutorizacao } from "@/lib/youtube";

const COOKIE_STATE = "yt_oauth_state";

/** "Conectar YouTube": manda o dono para o consentimento do Google (separado do login do app). */
export async function GET(request: Request) {
  const origem = new URL(request.url).origin;
  const usuario = await obterUsuario();
  if (!usuario) return NextResponse.redirect(new URL("/login", origem));

  // state aleatório em cookie: impede que alguém injete um retorno forjado (CSRF).
  const state = randomBytes(24).toString("base64url");
  let destino: string;
  try {
    destino = urlAutorizacao(state, `${origem}/api/youtube/callback`);
  } catch {
    return NextResponse.redirect(new URL("/destinos?erro=nao_configurado", origem));
  }

  const resposta = NextResponse.redirect(destino);
  resposta.cookies.set(COOKIE_STATE, state, {
    httpOnly: true,
    secure: origem.startsWith("https"),
    sameSite: "lax",
    path: "/api/youtube",
    maxAge: 600,
  });
  return resposta;
}
