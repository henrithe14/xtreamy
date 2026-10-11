import { resolverAcesso } from "@/lib/acesso";
import { validarCena } from "@/lib/cena";
import { gravarCenaNaSala } from "@/lib/livekit";

/** O diretor altera a cena; o servidor valida e grava nos metadata da sala. */
export async function POST(request: Request) {
  let corpo: { transmissaoId?: unknown; cena?: unknown };
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return Response.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const transmissaoId = typeof corpo.transmissaoId === "string" ? corpo.transmissaoId : "";
  const acesso = await resolverAcesso(transmissaoId, undefined);
  if (acesso?.papel !== "host") return Response.json({ erro: "Apenas o diretor muda a cena." }, { status: 403 });

  const cena = validarCena(corpo.cena);
  if (!cena) return Response.json({ erro: "Cena inválida." }, { status: 400 });

  try {
    await gravarCenaNaSala(transmissaoId, cena);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ erro: "A sala não respondeu. Tente de novo." }, { status: 502 });
  }
}
