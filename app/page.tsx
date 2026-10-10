import { Suspense } from "react";
import { CheckCircle, CircleNotch } from "@phosphor-icons/react/ssr";
import { Marca } from "@/components/ui/Marca";
import { StatusTally } from "@/components/ui/StatusTally";
import { EstadoConfiguracao } from "@/components/home/EstadoConfiguracao";

export default function Home() {
  return (
    <>
      <header className="flex items-center justify-between border-b border-borda px-4 py-3 sm:px-8">
        <Marca />
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-10 sm:px-8 sm:py-16">
        <MonitorPrograma />

        <section aria-labelledby="verificacao" className="max-w-xl">
          <h2 id="verificacao" className="mb-4 text-lg font-semibold">
            Verificação da instalação
          </h2>
          <ul className="flex flex-col gap-3">
            <li className="flex items-center gap-3 text-pronto">
              <CheckCircle weight="fill" className="size-5 shrink-0" aria-hidden />
              App no ar
            </li>
            <Suspense
              fallback={
                <li className="flex items-center gap-3 text-texto-suave">
                  <CircleNotch weight="bold" className="size-5 shrink-0 animate-spin" aria-hidden />
                  Verificando o Supabase…
                </li>
              }
            >
              <EstadoConfiguracao />
            </Suspense>
          </ul>
        </section>
      </main>
    </>
  );
}

/** Quadro 16:9 com marcas de área segura: o mesmo enquadramento da live. */
function MonitorPrograma() {
  return (
    <section className="relative flex min-h-[26rem] w-full flex-col justify-end overflow-hidden rounded-lg bg-superficie px-[9%] pt-24 pb-[12%] sm:aspect-video sm:min-h-0 sm:px-[6%] sm:pb-[10%]">
      <MarcasDeCanto />
      <div className="absolute top-8 right-8 sm:top-[7%] sm:right-[6%]">
        <StatusTally status="ensaio" />
      </div>
      <div className="relative max-w-3xl">
        <h1 className="fonte-larga text-[clamp(1.75rem,5.5vw,4.25rem)] leading-[1.02] font-extrabold text-balance">
          Sua live, dirigida do navegador.
        </h1>
        <p className="mt-3 max-w-[52ch] text-[clamp(0.9rem,1.6vw,1.125rem)] text-texto-suave">
          Convide até 10 pessoas por link, monte a cena e transmita para o YouTube.
        </p>
      </div>
    </section>
  );
}

function MarcasDeCanto() {
  const canto = "absolute size-[6%] min-h-5 min-w-5 border-texto-suave/50";
  return (
    <div aria-hidden className="absolute inset-[4%]">
      <span className={`${canto} top-0 left-0 border-t-2 border-l-2`} />
      <span className={`${canto} top-0 right-0 border-t-2 border-r-2`} />
      <span className={`${canto} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${canto} right-0 bottom-0 border-r-2 border-b-2`} />
    </div>
  );
}
