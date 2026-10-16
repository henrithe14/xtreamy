import { obterDirecao } from "@/lib/direcao";
import { accessTokenDoDestino } from "@/lib/destinos";
import { criarBilhete, enderecoRelay, transmitePeloNavegador } from "@/lib/relay";
import { enderecoRtmp, ErroYouTube } from "@/lib/youtube";

/**
 * Janela de transmissão: pede o bilhete para enviar o vídeo ao repetidor. Só quem dirige.
 * O endereço RTMP do YouTube vai cifrado; só o repetidor abre.
 */
export async function POST(request: Request) {
  if (!transmitePeloNavegador()) {
    return Response.json({ erro: "A transmissão pelo navegador não está configurada." }, { status: 404 });
  }
  let transmissaoId = "";
  let codigo: string | undefined;
  try {
    const corpo = (await request.json()) as { transmissaoId?: unknown; codigo?: unknown };
    transmissaoId = typeof corpo.transmissaoId === "string" ? corpo.transmissaoId : "";
    codigo = typeof corpo.codigo === "string" && corpo.codigo ? corpo.codigo : undefined;
  } catch {}

  const direcao = await obterDirecao(transmissaoId, codigo);
  if (!direcao) return Response.json({ erro: "Apenas o diretor transmite." }, { status: 403 });
  const t = direcao.transmissao;
  if (t.status === "encerrada") return Response.json({ erro: "Esta transmissão já foi encerrada." }, { status: 409 });
  if (!t.destino_id || !t.youtube_stream_id) {
    return Response.json({ erro: "Esta transmissão não tem canal do YouTube." }, { status: 409 });
  }

  try {
    const token = await accessTokenDoDestino(t.destino_id, direcao.donoId);
    const rtmp = await enderecoRtmp(token, t.youtube_stream_id);
    return Response.json({ relay: enderecoRelay(), bilhete: criarBilhete(rtmp) });
  } catch (e) {
    console.error("[live/sinal]", e instanceof Error ? e.message : e);
    const mensagem = e instanceof ErroYouTube ? e.message : "Não foi possível falar com o YouTube.";
    return Response.json({ erro: mensagem }, { status: 409 });
  }
}
