import { Suspense } from "react";
import { Marca } from "@/components/ui/Marca";
import { MenuUsuario } from "@/components/home/MenuUsuario";
import { NovaTransmissao } from "@/components/home/NovaTransmissao";
import { ListaTransmissoes, ListaTransmissoesCarregando } from "@/components/home/ListaTransmissoes";

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-vidro-borda bg-fundo/60 px-4 backdrop-blur-xl sm:px-8">
        <Marca />
        <Suspense>
          <MenuUsuario />
        </Suspense>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Transmissões</h1>
          <NovaTransmissao />
        </div>
        <Suspense fallback={<ListaTransmissoesCarregando />}>
          <ListaTransmissoes />
        </Suspense>
      </main>
    </>
  );
}
