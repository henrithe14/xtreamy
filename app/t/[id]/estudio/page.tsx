import type { Metadata } from "next";
import { Suspense } from "react";
import { resolverAcesso } from "@/lib/acesso";
import { obterTransmissaoDoUsuario, urlConvite } from "@/lib/transmissoes";
import { ConviteInvalido } from "@/components/entrar/ConviteInvalido";
import { Estudio } from "@/components/estudio/Estudio";

export const metadata: Metadata = { title: "Estúdio · Xtreamy" };

export default function PaginaEstudio({ params, searchParams }: PageProps<"/t/[id]/estudio">) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center text-texto-suave">Entrando no estúdio…</main>
      }
    >
      <Acesso params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Acesso({ params, searchParams }: Pick<PageProps<"/t/[id]/estudio">, "params" | "searchParams">) {
  const { id } = await params;
  const { c } = await searchParams;
  const codigo = typeof c === "string" ? c : undefined;
  const acesso = await resolverAcesso(id, codigo);

  if (!acesso) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <ConviteInvalido />
      </main>
    );
  }

  // Só o diretor recebe o link de convite (para o botão "Convidar").
  let convite: string | undefined;
  if (acesso.papel === "host") {
    const transmissao = await obterTransmissaoDoUsuario(id);
    if (transmissao) convite = urlConvite(transmissao);
  }

  return (
    <Estudio transmissaoId={id} codigo={codigo} titulo={acesso.titulo} papel={acesso.papel} urlConvite={convite} />
  );
}
