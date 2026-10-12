import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { resolverAcesso } from "@/lib/acesso";
import { criarTokenParticipante } from "@/lib/livekit";
import { LIMITES_IDENTIDADE } from "@/lib/preferencias";
import { ATRIBUTO_ESPELHAR } from "@/lib/participante";

type Pedido = {
  transmissaoId?: unknown;
  codigo?: unknown;
  nome?: unknown;
  etiqueta?: unknown;
  modoHost?: unknown;
  espelhar?: unknown;
};

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Entrega o token do LiveKit. O papel (host ou convidado) é decidido aqui, a partir
 * da sessão ou do código do convite — nunca do que o navegador diz.
 */
export async function POST(request: Request) {
  let pedido: Pedido;
  try {
    pedido = (await request.json()) as Pedido;
  } catch {
    return Response.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const transmissaoId = texto(pedido.transmissaoId);
  const codigo = texto(pedido.codigo) || undefined;
  const nome = texto(pedido.nome).slice(0, LIMITES_IDENTIDADE.nome);
  const etiqueta = texto(pedido.etiqueta).slice(0, LIMITES_IDENTIDADE.etiqueta);

  if (!nome) return Response.json({ erro: "Informe seu nome." }, { status: 400 });

  const acesso = await resolverAcesso(transmissaoId, codigo);
  if (!acesso) return Response.json({ erro: "Convite inválido." }, { status: 403 });

  // Identity estável por pessoa: o host usa a conta; o convidado ganha um id guardado
  // em cookie, para voltar como a mesma pessoa se recarregar a página.
  let identity: string;
  if (acesso.papel === "host" && acesso.userId) {
    identity = `host-${acesso.userId}`;
  } else {
    const cookieStore = await cookies();
    const nomeCookie = `estudio_id_${transmissaoId}`;
    identity = cookieStore.get(nomeCookie)?.value ?? `conv-${randomBytes(9).toString("base64url")}`;
    cookieStore.set(nomeCookie, identity, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }

  try {
    const token = await criarTokenParticipante({
      transmissaoId,
      identity,
      nome,
      metadados: {
        papel: acesso.papel,
        etiqueta,
        soDiretor: acesso.papel === "host" && pedido.modoHost === "diretor",
      },
      atributos: pedido.espelhar === true ? { [ATRIBUTO_ESPELHAR]: "1" } : undefined,
    });
    return Response.json({ token, papel: acesso.papel, identity });
  } catch {
    return Response.json({ erro: "O estúdio não está configurado para vídeo ainda." }, { status: 500 });
  }
}
