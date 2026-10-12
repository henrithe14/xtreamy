import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckCircle, WarningCircle, YoutubeLogo } from "@phosphor-icons/react/ssr";
import { exigirUsuario } from "@/lib/auth";
import { listarDestinos, type Destino } from "@/lib/destinos";
import { CabecalhoApp } from "@/components/home/CabecalhoApp";
import { BotaoDesconectar } from "@/components/destinos/BotaoDesconectar";

export const metadata: Metadata = { title: "Destinos · Xtreamy" };

const ERROS: Record<string, string> = {
  cancelado: "A conexão foi cancelada na tela do Google.",
  sessao: "A conexão expirou ou veio de outra aba. Clique em Conectar YouTube de novo.",
  sem_canal: "Esta conta Google não tem um canal do YouTube. Crie o canal e tente de novo.",
  sem_refresh: "O Google não devolveu acesso permanente. Tente conectar de novo.",
  nao_configurado: "O login do Google ainda não está configurado no servidor.",
  invalid_grant: "O Google recusou o código de acesso. Tente conectar de novo.",
};

const formatoData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });

export default function PaginaDestinos({ searchParams }: PageProps<"/destinos">) {
  return (
    <>
      <CabecalhoApp ativo="/destinos" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Destinos</h1>
            <p className="mt-1 max-w-[56ch] text-texto-suave">
              Canais onde suas lives são publicadas. O Xtreamy cria a live no YouTube por você, sem copiar chave de
              transmissão.
            </p>
          </div>
          {/* Link comum (não <Link>): sai do app para o Google e volta. */}
          <a
            href="/api/youtube/conectar"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-destaque px-4 font-semibold text-destaque-texto shadow-[0_8px_24px_-12px_rgb(59_130_246/0.8)] hover:bg-destaque-forte [&_svg]:size-5"
          >
            <YoutubeLogo weight="bold" aria-hidden />
            Conectar YouTube
          </a>
        </div>

        <Suspense>
          <Aviso searchParams={searchParams} />
        </Suspense>

        <Suspense fallback={<div className="vidro h-24 animate-pulse rounded-xl" aria-label="Carregando destinos" />}>
          <ListaDestinos />
        </Suspense>
      </main>
    </>
  );
}

async function Aviso({ searchParams }: Pick<PageProps<"/destinos">, "searchParams">) {
  const { conectado, erro, msg } = await searchParams;
  if (conectado) {
    return (
      <p role="status" className="flex items-center gap-3 rounded-xl bg-pronto/10 px-4 py-3 text-pronto ring-1 ring-pronto/25 ring-inset">
        <CheckCircle weight="bold" className="size-5 shrink-0" aria-hidden />
        Canal conectado. Agora você pode escolhê-lo ao criar uma transmissão.
      </p>
    );
  }
  if (typeof erro === "string") {
    return (
      <p role="alert" className="flex items-center gap-3 rounded-xl bg-no-ar/10 px-4 py-3 text-no-ar ring-1 ring-no-ar/20 ring-inset">
        <WarningCircle weight="bold" className="size-5 shrink-0" aria-hidden />
        <span>
          {ERROS[erro] || (typeof msg === "string" && msg) || "Não foi possível conectar o canal. Tente de novo."}{" "}
          <span className="text-xs opacity-70">(código: {erro})</span>
        </span>
      </p>
    );
  }
  return null;
}

async function ListaDestinos() {
  await exigirUsuario();
  let destinos: Destino[];
  try {
    destinos = await listarDestinos();
  } catch {
    return <p className="text-no-ar">Não foi possível carregar os destinos. Recarregue a página.</p>;
  }

  if (destinos.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10">
        <YoutubeLogo weight="bold" className="size-8 text-texto-suave" aria-hidden />
        <p className="font-semibold">Nenhum canal conectado</p>
        <p className="max-w-[48ch] text-texto-suave">
          Conecte seu canal do YouTube para publicar as lives direto do estúdio.
        </p>
      </div>
    );
  }

  return (
    <ul className="vidro divide-y divide-white/[0.06] overflow-hidden rounded-xl">
      {destinos.map((d) => (
        <li key={d.id} className="flex items-center gap-4 px-5 py-4">
          {d.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar externo pequeno, sem otimização
            <img src={d.avatar_url} alt="" className="size-11 shrink-0 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
              <YoutubeLogo weight="bold" className="size-6 text-texto-suave" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{d.nome_canal}</p>
            <p className="text-sm text-texto-suave">YouTube, conectado em {formatoData.format(new Date(d.criado_em))}</p>
          </div>
          <BotaoDesconectar id={d.id} nome={d.nome_canal} />
        </li>
      ))}
    </ul>
  );
}
