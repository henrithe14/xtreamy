import { Suspense } from "react";
import { Marca } from "@/components/ui/Marca";
import { MenuUsuario } from "@/components/home/MenuUsuario";
import { NovaTransmissao } from "@/components/home/NovaTransmissao";
import { ListaTransmissoes, ListaTransmissoesCarregando } from "@/components/home/ListaTransmissoes";

export default function Home() {
  return (
    <>
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-borda px-4 sm:px-8">
        <Marca />
        <Suspense>
          <MenuUsuario />
        </Suspense>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="fonte-larga text-3xl font-extrabold sm:text-4xl">Transmissões</h1>
          <NovaTransmissao />
        </div>
        <Suspense fallback={<ListaTransmissoesCarregando />}>
          <ListaTransmissoes />
        </Suspense>
      </main>
    </>
  );
}
