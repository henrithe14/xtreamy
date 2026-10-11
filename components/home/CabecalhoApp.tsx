import { Suspense } from "react";
import Link from "next/link";
import { Marca } from "@/components/ui/Marca";
import { MenuUsuario } from "@/components/home/MenuUsuario";

const LINKS = [
  { href: "/", rotulo: "Transmissões" },
  { href: "/destinos", rotulo: "Destinos" },
] as const;

/** Cabeçalho das páginas do criador (logado). */
export function CabecalhoApp({ ativo }: { ativo: (typeof LINKS)[number]["href"] }) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-vidro-borda bg-fundo/60 px-4 backdrop-blur-xl sm:px-8">
      <div className="flex items-center gap-6">
        <Link href="/" aria-label="Xtreamy, início">
          <Marca className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
        </Link>
        <nav aria-label="Principal" className="flex gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.href === ativo ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                l.href === ativo ? "bg-white/[0.08] text-texto" : "text-texto-suave hover:bg-white/[0.05] hover:text-texto"
              }`}
            >
              {l.rotulo}
            </Link>
          ))}
        </nav>
      </div>
      <Suspense>
        <MenuUsuario />
      </Suspense>
    </header>
  );
}
