import "server-only";
import { obterUsuario } from "@/lib/auth";
import { obterTransmissaoDoUsuario, validarConvite } from "@/lib/transmissoes";
import type { PapelSala } from "@/lib/participante";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Acesso = { papel: PapelSala; titulo: string; userId?: string };

/**
 * Quem pode entrar na transmissão e com qual papel. Vale para as páginas e para o
 * token: a permissão nunca vem de parâmetro confiado no cliente.
 *
 * - Com código de convite: sempre convidado, mesmo que o dono esteja logado
 *   (o link de convite é para convidados; o dono pode testar como convidado).
 * - Sem código: host, se for o dono logado.
 */
export async function resolverAcesso(id: string, codigo: string | undefined): Promise<Acesso | null> {
  if (!UUID.test(id)) return null;

  if (codigo) {
    const titulo = await validarConvite(id, codigo);
    return titulo ? { papel: "convidado", titulo } : null;
  }

  const usuario = await obterUsuario();
  if (!usuario) return null;
  const transmissao = await obterTransmissaoDoUsuario(id);
  return transmissao ? { papel: "host", titulo: transmissao.titulo, userId: usuario.id } : null;
}
