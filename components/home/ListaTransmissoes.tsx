import Link from "next/link";
import { ArrowSquareIn, VideoCamera, WarningCircle } from "@phosphor-icons/react/ssr";
import { exigirUsuario } from "@/lib/auth";
import { listarTransmissoes, urlConvite, type Transmissao } from "@/lib/transmissoes";
import { StatusTally } from "@/components/ui/StatusTally";
import { BotaoCopiarConvite } from "@/components/home/BotaoCopiarConvite";
import { BotaoExcluir } from "@/components/home/BotaoExcluir";

const PRIVACIDADE: Record<Transmissao["privacidade"], string> = {
  nao_listada: "Não listada",
  publica: "Pública",
  privada: "Privada",
};

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export async function ListaTransmissoes() {
  await exigirUsuario();

  let transmissoes: Transmissao[];
  try {
    transmissoes = await listarTransmissoes();
  } catch {
    return (
      <p className="flex items-center gap-3 rounded-lg bg-no-ar/10 px-4 py-4 text-no-ar">
        <WarningCircle weight="fill" className="size-5 shrink-0" aria-hidden />
        Não foi possível carregar suas transmissões. Recarregue a página para tentar de novo.
      </p>
    );
  }

  if (transmissoes.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-borda px-6 py-10">
        <VideoCamera weight="fill" className="size-8 text-texto-suave" aria-hidden />
        <p className="font-semibold">Nenhuma transmissão ainda</p>
        <p className="max-w-[48ch] text-texto-suave">
          Crie a primeira para gerar o link de convite e chamar as pessoas para o estúdio.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-borda overflow-hidden rounded-lg bg-superficie">
      {transmissoes.map((t) => (
        <li key={t.id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <StatusTally status={t.status} />
              <h2 className="min-w-0 truncate text-lg font-semibold">{t.titulo}</h2>
            </div>
            <p className="text-sm text-texto-suave">
              Criada em {formatoData.format(new Date(t.criado_em))}, {PRIVACIDADE[t.privacidade].toLowerCase()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/t/${t.id}/entrar`}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-destaque px-4 font-semibold text-destaque-texto transition-colors hover:bg-destaque-forte [&_svg]:size-5"
            >
              <ArrowSquareIn weight="fill" aria-hidden />
              Entrar no estúdio
            </Link>
            <BotaoCopiarConvite url={urlConvite(t)} />
            <BotaoExcluir id={t.id} titulo={t.titulo} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ListaTransmissoesCarregando() {
  return (
    <ul
      aria-busy="true"
      aria-label="Carregando transmissões"
      className="divide-y divide-borda overflow-hidden rounded-lg bg-superficie"
    >
      {[0, 1].map((i) => (
        <li key={i} className="flex flex-col gap-2 px-5 py-5">
          <span className="h-5 w-56 max-w-full animate-pulse rounded bg-superficie-2" />
          <span className="h-4 w-40 animate-pulse rounded bg-superficie-2" />
        </li>
      ))}
    </ul>
  );
}
