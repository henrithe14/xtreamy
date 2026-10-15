import { obterDirecao } from "@/lib/direcao";
import { salvarVisual } from "@/lib/cenaSalva";
import { validarCena } from "@/lib/cena";
import { gravarCenaNaSala, lerCenaDaSala } from "@/lib/livekit";

/** O diretor altera a cena; o servidor valida e grava nos metadata da sala. */
export async function POST(request: Request) {
  let corpo: { transmissaoId?: unknown; codigo?: unknown; cena?: unknown };
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return Response.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const transmissaoId = typeof corpo.transmissaoId === "string" ? corpo.transmissaoId : "";
  const codigo = typeof corpo.codigo === "string" && corpo.codigo ? corpo.codigo : undefined;
  const direcao = await obterDirecao(transmissaoId, codigo);
  if (!direcao) return Response.json({ erro: "Apenas o diretor muda a cena." }, { status: 403 });

  const cena = validarCena(corpo.cena);
  if (!cena) return Response.json({ erro: "Cena inválida." }, { status: 400 });

  try {
    // Status e horário no ar são do servidor (Iniciar/Intervalo/Encerrar): nunca do navegador.
    const atual = await lerCenaDaSala(transmissaoId);
    await gravarCenaNaSala(transmissaoId, { ...cena, status: atual.status, noArDesde: atual.noArDesde, encerradaEm: atual.encerradaEm });
    // Lembra o visual para a próxima sessão e as próximas transmissões do criador.
    await salvarVisual(direcao.donoId, cena);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ erro: "A sala não respondeu. Tente de novo." }, { status: 502 });
  }
}
