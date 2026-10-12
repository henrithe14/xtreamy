import { cookies } from "next/headers";
import { resolverAcesso } from "@/lib/acesso";
import { obterDirecao } from "@/lib/direcao";
import { atualizarMetadados, definirAtributos } from "@/lib/livekit";
import { LIMITES_IDENTIDADE } from "@/lib/preferencias";
import { ATRIBUTO_AUDIO_PRIVADO, ATRIBUTO_DIRETOR, ATRIBUTO_ESPELHAR, ehPonto } from "@/lib/participante";

type Pedido = {
  transmissaoId?: unknown;
  codigo?: unknown;
  alvo?: unknown;
  audioPrivado?: unknown;
  espelhar?: unknown;
  diretor?: unknown;
  soDiretor?: unknown;
  etiqueta?: unknown;
};

/**
 * Muda o estado de um participante na sala:
 * - audioPrivado ("mudo para a live") e espelhar (câmera espelhada, também na live): o
 *   diretor em qualquer pessoa; o convidado só em si mesmo.
 * - soDiretor: só o diretor, em si mesmo.
 * - etiqueta (texto abaixo do nome na live): o diretor em qualquer pessoa; o convidado em si.
 * - diretor (diretor delegado): só o dono, em um convidado.
 * "O diretor" aqui é o dono ou um convidado com direção delegada.
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

  const direcao = await obterDirecao(transmissaoId, codigo);
  const eu =
    direcao?.identity ??
    (acesso.papel === "host" && acesso.userId ? `host-${acesso.userId}` : (await cookies()).get(`estudio_id_${transmissaoId}`)?.value);
  const souHost = direcao !== null;
  const souDono = direcao?.tipo === "dono";
  if (!souHost && alvo !== eu) return Response.json({ erro: "Você só pode mudar o seu próprio estado." }, { status: 403 });

  try {
    if (typeof p.audioPrivado === "boolean") {
      await definirAtributos(transmissaoId, alvo, { [ATRIBUTO_AUDIO_PRIVADO]: p.audioPrivado ? "1" : "" });
    }
    if (typeof p.espelhar === "boolean") {
      await definirAtributos(transmissaoId, alvo, { [ATRIBUTO_ESPELHAR]: p.espelhar ? "1" : "" });
    }
    if (typeof p.diretor === "boolean") {
      if (!souDono || alvo.startsWith("host-")) return Response.json({ erro: "Só o dono passa a direção a um convidado." }, { status: 403 });
      await definirAtributos(transmissaoId, alvo, { [ATRIBUTO_DIRETOR]: p.diretor ? "1" : "" });
    }
    if (typeof p.soDiretor === "boolean") {
      if (!souDono || alvo !== eu) return Response.json({ erro: "Só o diretor muda o próprio modo." }, { status: 403 });
      await atualizarMetadados(transmissaoId, alvo, { soDiretor: p.soDiretor });
    }
    if (typeof p.etiqueta === "string") {
      await atualizarMetadados(transmissaoId, alvo, { etiqueta: p.etiqueta.trim().slice(0, LIMITES_IDENTIDADE.etiqueta) });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ erro: "A sala não respondeu. Tente de novo." }, { status: 502 });
  }
}
