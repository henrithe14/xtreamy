import type { Metadata } from "next";
import { ArrowSquareOut } from "@phosphor-icons/react/ssr";
import { CREDITOS_AUDIO, type CreditoAudio } from "@/lib/creditosAudio";
import { Marca } from "@/components/ui/Marca";

export const metadata: Metadata = { title: "Créditos de áudio · Xtreamy" };

/** Autores da biblioteca padrão de música e efeitos (todos CC0, domínio público). */
export default function PaginaCreditos() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <Marca />
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Créditos de áudio</h1>
        <p className="text-texto-suave">
          As músicas e os efeitos da biblioteca padrão estão em domínio público (CC0 1.0): podem ser usados nas lives sem
          pedir permissão nem dar crédito. Mesmo assim, agradecemos a quem os criou.
        </p>
      </header>
      <Lista titulo="Músicas" itens={CREDITOS_AUDIO.filter((c) => c.tipo === "musica")} />
      <Lista titulo="Efeitos sonoros" itens={CREDITOS_AUDIO.filter((c) => c.tipo === "efeito")} />
    </main>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens: CreditoAudio[] }) {
  return (
    <section className="vidro flex flex-col gap-1 rounded-xl p-4 sm:p-5">
      <h2 className="mb-2 text-sm font-semibold">{titulo}</h2>
      <ul className="flex flex-col divide-y divide-white/[0.06]">
        {itens.map((c) => (
          <li key={c.nome} className="flex items-center gap-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{c.nome}</span>
            <span className="shrink-0 text-texto-suave">{c.autor}</span>
            <a
              href={c.pagina}
              target="_blank"
              rel="noreferrer"
              aria-label={`Página original de ${c.nome}`}
              className="shrink-0 rounded p-1 text-texto-suave hover:bg-white/10 hover:text-texto"
            >
              <ArrowSquareOut weight="bold" className="size-4" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
