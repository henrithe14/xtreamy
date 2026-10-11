import type { Metadata } from "next";
import { Suspense } from "react";
import { LinkBreak } from "@phosphor-icons/react/ssr";
import { obterUsuario } from "@/lib/auth";
import { obterTransmissaoDoUsuario, validarConvite } from "@/lib/transmissoes";
import { Marca } from "@/components/ui/Marca";
import { PreEntrada } from "@/components/entrar/PreEntrada";

export const metadata: Metadata = { title: "Entrar no estúdio · Estúdio" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PaginaEntrar({ params, searchParams }: PageProps<"/t/[id]/entrar">) {
  return (
    <>
      <header className="flex min-h-16 items-center border-b border-borda px-4 sm:px-8">
        <Marca />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 sm:py-10">
        <Suspense fallback={<p className="text-texto-suave">Verificando o convite…</p>}>
          <Acesso params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </>
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
      <section className="flex max-w-md flex-col items-start gap-3">
        <LinkBreak weight="fill" className="size-10 text-no-ar" aria-hidden />
        <h1 className="fonte-larga text-2xl font-extrabold">Convite inválido</h1>
        <p className="text-texto-suave">
          Este link não funciona mais ou está incompleto. Peça um novo convite a quem organizou a
          transmissão.
        </p>
      </section>
    );
  }

  return <PreEntrada titulo={acesso.titulo} papel={acesso.papel} />;
}
