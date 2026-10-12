import Link from "next/link";
import { ArrowSquareIn, ArrowSquareOut, CalendarBlank, VideoCamera, WarningCircle, YoutubeLogo } from "@phosphor-icons/react/ssr";
import { listarDestinos } from "@/lib/destinos";
import { linkStudio } from "@/lib/youtube";
import { exigirUsuario } from "@/lib/auth";
import { listarTransmissoes, urlConvite, type Transmissao } from "@/lib/transmissoes";
import { StatusTally } from "@/components/ui/StatusTally";
import { BotaoCopiarConvite } from "@/components/home/BotaoCopiarConvite";
import { BotaoExcluir } from "@/components/home/BotaoExcluir";
import { ConfigurarLive } from "@/components/home/ConfigurarLive";

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
      <p className="flex items-center gap-3 rounded-xl bg-no-ar/10 px-4 py-4 text-no-ar ring-1 ring-no-ar/20 ring-inset">
        <WarningCircle weight="bold" className="size-5 shrink-0" aria-hidden />
        Não foi possível carregar suas transmissões. Recarregue a página para tentar de novo.
      </p>
    );
  }

  // Nome do canal de cada transmissão (se a lista de destinos falhar, só não mostra).
  const canais = new Map<string, string>();
  try {
    for (const d of await listarDestinos()) canais.set(d.id, d.nome_canal);
  } catch {}

  if (transmissoes.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10">
        <VideoCamera weight="bold" className="size-8 text-texto-suave" aria-hidden />
        <p className="font-semibold">Nenhuma transmissão ainda</p>
        <p className="max-w-[48ch] text-texto-suave">
          Crie a primeira para gerar o link de convite e chamar as pessoas para o estúdio.
        </p>
      </div>
    );
  }

  return (
    <ul className="vidro divide-y divide-white/[0.06] overflow-hidden rounded-xl">
      {transmissoes.map((t) => (
        <li key={t.id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <StatusTally status={t.status} />
              <h2 className="min-w-0 truncate text-lg font-semibold">{t.titulo}</h2>
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-texto-suave">
              {t.agendada_para ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-texto">
                  <CalendarBlank weight="bold" className="size-4 text-texto-suave" aria-hidden />
                  Agendada para {formatoData.format(new Date(t.agendada_para))}
                </span>
              ) : (
                <span>Criada em {formatoData.format(new Date(t.criado_em))}</span>
              )}
              <span>{PRIVACIDADE[t.privacidade]}</span>
              {t.youtube_broadcast_id ? (
                <a
                  href={linkStudio(t.youtube_broadcast_id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-texto"
                >
                  <YoutubeLogo weight="bold" className="size-4 text-texto-suave" aria-hidden />
                  {(t.destino_id && canais.get(t.destino_id)) || "YouTube"}
                  <ArrowSquareOut weight="bold" className="size-3.5" aria-label="abre no YouTube Studio" />
                </a>
              ) : (
                <span>Sem canal (só ensaio)</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/t/${t.id}/entrar`}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-destaque px-4 font-semibold text-destaque-texto shadow-[0_8px_24px_-12px_rgb(59_130_246/0.8)] transition-colors hover:bg-destaque-forte [&_svg]:size-5"
            >
              <ArrowSquareIn weight="bold" aria-hidden />
              Entrar no estúdio
            </Link>
            {t.youtube_broadcast_id && <ConfigurarLive live={t} />}
            <BotaoCopiarConvite url={urlConvite(t)} />
            <BotaoExcluir id={t.id} titulo={t.titulo} temLiveNoYoutube={Boolean(t.youtube_broadcast_id)} />
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
      className="vidro divide-y divide-white/[0.06] overflow-hidden rounded-xl"
    >
      {[0, 1].map((i) => (
        <li key={i} className="flex flex-col gap-2 px-5 py-5">
          <span className="h-5 w-56 max-w-full animate-pulse rounded bg-white/[0.06]" />
          <span className="h-4 w-40 animate-pulse rounded bg-white/[0.06]" />
        </li>
      ))}
    </ul>
  );
}
