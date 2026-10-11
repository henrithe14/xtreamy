import { cookies } from "next/headers";
import { resolverAcesso } from "@/lib/acesso";
import { definirAtributos, definirSoDiretor } from "@/lib/livekit";
import { ATRIBUTO_AUDIO_PRIVADO, ehPonto } from "@/lib/participante";

type Pedido = { transmissaoId?: unknown; codigo?: unknown; alvo?: unknown; audioPrivado?: unknown; soDiretor?: unknown };

/**
 * Muda o estado de um participante na sala:
 * - audioPrivado ("mudo para a live"): o diretor em qualquer pessoa; o convidado só em si mesmo.
 * - soDiretor: só o diretor, em si mesmo.
 * Quem pede é identificado pelo servidor (sessão do dono ou cookie do convidado).
 */
export async function POST(request: Request) {
  let p: Pedido;
  try {
    p = (await request.json()) as Pedido;
  } catch {
    return Response.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const transmissaoId = typeof p.transmissaoId === "string" ? p.transmissaoId : "";
  const codigo = typeof p.codigo === "string" && p.codigo ? p.codigo : undefined;
  const alvo = typeof p.alvo === "string" ? p.alvo : "";
  if (!alvo || ehPonto(alvo)) return Response.json({ erro: "Participante inválido." }, { status: 400 });

  const acesso = await resolverAcesso(transmissaoId, codigo);
  if (!acesso) return Response.json({ erro: "Sem acesso a esta transmissão." }, { status: 403 });

  const eu =
    acesso.papel === "host" && acesso.userId
      ? `host-${acesso.userId}`
      : (await cookies()).get(`estudio_id_${transmissaoId}`)?.value;
  const souHost = acesso.papel === "host";
  if (!souHost && alvo !== eu) return Response.json({ erro: "Você só pode mudar o seu próprio estado." }, { status: 403 });

  try {
    if (typeof p.audioPrivado === "boolean") {
      await definirAtributos(transmissaoId, alvo, { [ATRIBUTO_AUDIO_PRIVADO]: p.audioPrivado ? "1" : "" });
    }
    if (typeof p.soDiretor === "boolean") {
      if (!souHost || alvo !== eu) return Response.json({ erro: "Só o diretor muda o próprio modo." }, { status: 403 });
      await definirSoDiretor(transmissaoId, alvo, p.soDiretor);
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ erro: "A sala não respondeu. Tente de novo." }, { status: 502 });
  }
}
