import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { obterUsuario } from "@/lib/auth";
import { salvarDestino } from "@/lib/destinos";
import { canalDaConta, ErroYouTube, trocarCodigo } from "@/lib/youtube";

const COOKIE_STATE = "yt_oauth_state";

/** Volta do Google: confere o state, troca o código por tokens e salva o canal. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const voltar = (consulta: string) => NextResponse.redirect(new URL(`/destinos?${consulta}`, url.origin));

  const usuario = await obterUsuario();
  if (!usuario) return NextResponse.redirect(new URL("/login", url.origin));

  const cookieStore = await cookies();
  const stateSalvo = cookieStore.get(COOKIE_STATE)?.value;
  cookieStore.delete({ name: COOKIE_STATE, path: "/api/youtube" });

  if (url.searchParams.get("error")) return voltar("erro=cancelado");
  const codigo = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!codigo || !state || !stateSalvo || state !== stateSalvo) return voltar("erro=sessao");

  try {
    const { accessToken, refreshToken } = await trocarCodigo(codigo, `${url.origin}/api/youtube/callback`);
    const canal = await canalDaConta(accessToken);
    await salvarDestino({
      userId: usuario.id,
      channelId: canal.channelId,
      nome: canal.nome,
      avatarUrl: canal.avatarUrl,
      refreshToken,
    });
    return voltar("conectado=1");
  } catch (e) {
    const motivo = e instanceof ErroYouTube ? e.motivo : "falha";
    // Só o motivo/mensagem, nunca tokens.
    console.error("[youtube/callback] falhou:", motivo, e instanceof Error ? e.message : "");
    const msg = e instanceof ErroYouTube ? e.message : "";
    return voltar(`erro=${encodeURIComponent(motivo)}${msg ? `&msg=${encodeURIComponent(msg)}` : ""}`);
  }
}
