import { obterDirecao } from "@/lib/direcao";
import { accessTokenDoDestino } from "@/lib/destinos";
import { ErroYouTube, lerChat } from "@/lib/youtube";

/**
 * Chat do YouTube para o painel do diretor. O token do Google fica no servidor; o
 * navegador recebe só as mensagens e quanto esperar até a próxima leitura.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const transmissaoId = url.searchParams.get("t") ?? "";
  const pagina = url.searchParams.get("pagina") ?? undefined;

  const codigo = url.searchParams.get("c") || undefined;

  const direcao = await obterDirecao(transmissaoId, codigo);
  if (!direcao) return Response.json({ erro: "Apenas o diretor lê o chat por aqui." }, { status: 403 });
  const t = direcao.transmissao;
  if (!t?.destino_id || !t.live_chat_id) {
    return Response.json({ erro: "Esta transmissão não tem chat do YouTube.", encerrado: true }, { status: 404 });
  }

  try {
    const token = await accessTokenDoDestino(t.destino_id, direcao.donoId);
    return Response.json(await lerChat(token, t.live_chat_id, pagina));
  } catch (e) {
    const motivo = e instanceof ErroYouTube ? e.motivo : "falha";
    const fim = ["liveChatEnded", "liveChatNotFound", "liveChatDisabled", "quotaExceeded"].includes(motivo);
    return Response.json(
      { erro: e instanceof ErroYouTube ? e.message : "Não foi possível ler o chat.", encerrado: fim, intervaloMs: 15000 },
      { status: 502 },
    );
  }
}
