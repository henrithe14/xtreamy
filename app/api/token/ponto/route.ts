import { resolverAcesso } from "@/lib/acesso";
import { criarTokenPonto } from "@/lib/livekit";

/** Token da conexão do ponto (só o diretor). */
export async function POST(request: Request) {
  let corpo: { transmissaoId?: unknown };
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return Response.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const transmissaoId = typeof corpo.transmissaoId === "string" ? corpo.transmissaoId : "";
  const acesso = await resolverAcesso(transmissaoId, undefined);
  if (acesso?.papel !== "host" || !acesso.userId) {
    return Response.json({ erro: "Apenas o diretor usa o ponto." }, { status: 403 });
  }
  try {
    return Response.json({ token: await criarTokenPonto(transmissaoId, acesso.userId) });
  } catch {
    return Response.json({ erro: "O estúdio não está configurado para vídeo ainda." }, { status: 500 });
  }
}
