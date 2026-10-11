import { Suspense } from "react";
import { CabecalhoApp } from "@/components/home/CabecalhoApp";
import { NovaTransmissaoServidor } from "@/components/home/NovaTransmissaoServidor";
import { Botao } from "@/components/ui/Botao";
import { ListaTransmissoes, ListaTransmissoesCarregando } from "@/components/home/ListaTransmissoes";

export default function Home() {
  return (
    <>
      <CabecalhoApp ativo="/" />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Transmissões</h1>
          <Suspense fallback={<Botao disabled>Nova transmissão</Botao>}>
            <NovaTransmissaoServidor />
          </Suspense>
        </div>
        <Suspense fallback={<ListaTransmissoesCarregando />}>
          <ListaTransmissoes />
        </Suspense>
      </main>
    </>
  );
}
