import { obterDirecao } from "@/lib/direcao";
import { criarTokenStage } from "@/lib/livekit";

/** Token da aba de saída (/stage) — só para o diretor conferir o que vai ao ar. */
export async function POST(request: Request) {
  let corpo: { transmissaoId?: unknown; codigo?: unknown };
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return Response.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const transmissaoId = typeof corpo.transmissaoId === "string" ? corpo.transmissaoId : "";
  const codigo = typeof corpo.codigo === "string" && corpo.codigo ? corpo.codigo : undefined;
  if (!(await obterDirecao(transmissaoId, codigo))) return Response.json({ erro: "Apenas o diretor abre a saída." }, { status: 403 });

  try {
    return Response.json({ token: await criarTokenStage(transmissaoId) });
  } catch {
    return Response.json({ erro: "O estúdio não está configurado para vídeo ainda." }, { status: 500 });
  }
}
