import type { Metadata } from "next";
import { Suspense } from "react";
import { resolverAcesso } from "@/lib/acesso";
import { Marca } from "@/components/ui/Marca";
import { PreEntrada } from "@/components/entrar/PreEntrada";
import { ConviteInvalido } from "@/components/entrar/ConviteInvalido";

export const metadata: Metadata = { title: "Entrar no estúdio · Xtreamy" };

export default function PaginaEntrar({ params, searchParams }: PageProps<"/t/[id]/entrar">) {
  return (
    <>
      <header className="sticky top-0 z-20 flex min-h-16 items-center border-b border-vidro-borda bg-fundo/60 px-4 backdrop-blur-xl sm:px-8">
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

async function Acesso({
  params,
  searchParams,
}: Pick<PageProps<"/t/[id]/entrar">, "params" | "searchParams">) {
  const { id } = await params;
  const { c } = await searchParams;
  const codigo = typeof c === "string" ? c : undefined;
  const acesso = await resolverAcesso(id, codigo);

  if (!acesso) return <ConviteInvalido />;

  return <PreEntrada transmissaoId={id} codigo={codigo} titulo={acesso.titulo} papel={acesso.papel} />;
}
