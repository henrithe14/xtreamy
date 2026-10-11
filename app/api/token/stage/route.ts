import { resolverAcesso } from "@/lib/acesso";
import { criarTokenStage } from "@/lib/livekit";

/** Token da aba de saída (/stage) — só para o diretor conferir o que vai ao ar. */
export async function POST(request: Request) {
  let corpo: { transmissaoId?: unknown };
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return Response.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const transmissaoId = typeof corpo.transmissaoId === "string" ? corpo.transmissaoId : "";
  const acesso = await resolverAcesso(transmissaoId, undefined);
  if (acesso?.papel !== "host") return Response.json({ erro: "Apenas o diretor abre a saída." }, { status: 403 });

  try {
    return Response.json({ token: await criarTokenStage(transmissaoId) });
  } catch {
    return Response.json({ erro: "O estúdio não está configurado para vídeo ainda." }, { status: 500 });
  }
}
