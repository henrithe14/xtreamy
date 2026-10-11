import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle, LinkBreak } from "@phosphor-icons/react/ssr";
import { obterUsuario } from "@/lib/auth";
import { obterTransmissaoDoUsuario, validarConvite } from "@/lib/transmissoes";
import { Marca } from "@/components/ui/Marca";

export const metadata: Metadata = { title: "Entrar no estúdio · Estúdio" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PaginaEntrar({ params, searchParams }: PageProps<"/t/[id]/entrar">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Marca className="mb-10" />
        <Suspense fallback={<p className="text-texto-suave">Verificando o convite…</p>}>
          <Acesso params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

type Papel = { papel: "host" | "convidado"; titulo: string } | null;

/** Dono logado entra como diretor; os demais precisam do código do convite. */
async function resolverPapel(id: string, codigo: string | undefined): Promise<Papel> {
  if (!UUID.test(id)) return null;

  const usuario = await obterUsuario();
  if (usuario) {
    const transmissao = await obterTransmissaoDoUsuario(id);
    if (transmissao) return { papel: "host", titulo: transmissao.titulo };
  }

  if (!codigo) return null;
  const titulo = await validarConvite(id, codigo);
  return titulo ? { papel: "convidado", titulo } : null;
}

async function Acesso({
  params,
  searchParams,
}: Pick<PageProps<"/t/[id]/entrar">, "params" | "searchParams">) {
  const { id } = await params;
  const { c } = await searchParams;
  const acesso = await resolverPapel(id, typeof c === "string" ? c : undefined);

  if (!acesso) {
    return (
      <section className="flex flex-col items-start gap-3">
        <LinkBreak weight="fill" className="size-10 text-no-ar" aria-hidden />
        <h1 className="fonte-larga text-2xl font-extrabold">Convite inválido</h1>
        <p className="text-texto-suave">
          Este link não funciona mais ou está incompleto. Peça um novo convite a quem organizou a
          transmissão.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col items-start gap-3">
      <CheckCircle weight="fill" className="size-10 text-pronto" aria-hidden />
      <p className="text-sm text-texto-suave">
        {acesso.papel === "host" ? "Você vai entrar como diretor de" : "Você foi convidado para"}
      </p>
      <h1 className="fonte-larga text-2xl font-extrabold text-balance">{acesso.titulo}</h1>
      <p className="text-texto-suave">
        A tela para testar câmera e microfone antes de entrar fica pronta na próxima etapa.
      </p>
      {acesso.papel === "host" && (
        <Link href="/" className="mt-2 font-semibold text-destaque hover:underline">
          Voltar para as transmissões
        </Link>
      )}
    </section>
  );
}
