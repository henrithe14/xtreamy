"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FilmStrip, Play, Stop, Trash, UploadSimple } from "@phosphor-icons/react";
import { useEnvioAtivo } from "@/hooks/useEnvioAtivo";
import { excluirAtivo, listarAtivos, type Ativo } from "@/lib/acoes/ativos";
import { ACEITOS, CATEGORIAS, ehVideo, type CategoriaMidia, type TipoAtivo } from "@/lib/ativos";
import type { Cena, PosicaoLogo } from "@/lib/cena";
import { MensagemErro } from "@/components/ui/Campo";

type Alterar = (mudanca: (atual: Cena) => Omit<Cena, "versao">) => void;

const POSICOES: { id: PosicaoLogo; nome: string }[] = [
  { id: "se", nome: "Superior esquerdo" },
  { id: "sd", nome: "Superior direito" },
  { id: "ie", nome: "Inferior esquerdo" },
  { id: "id", nome: "Inferior direito" },
];

/** Aba Mídia do diretor: logo, overlay, fundo, mídias por momento e vinhetas. */
/** `sala`: diretor delegado (lê a biblioteca do dono; não envia nem apaga). */
export function PainelMidia({ cena, alterar, sala }: { cena: Cena; alterar: Alterar; sala?: { transmissaoId: string; codigo: string } }) {
  const podeEnviar = !sala;
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [aviso, setAviso] = useState<string>();

  const carregar = useCallback(async () => {
    const r = await listarAtivos(sala);
    setAtivos(r.ativos ?? []);
    setAviso(r.erro);
  }, [sala]);

  useEffect(() => {
    void listarAtivos(sala).then((r) => {
      setAtivos(r.ativos ?? []);
      setAviso(r.erro);
    });
  }, [sala]);

  const doTipo = (tipo: TipoAtivo) => ativos.filter((a) => a.tipo === tipo);
  const excluir = async (a: Ativo) => {
    await excluirAtivo(a.id);
    // Se estava em uso na cena, sai também.
    alterar((c) => ({
      ...c,
      logo: c.logo?.url === a.url ? null : c.logo,
      overlay: c.overlay === a.url ? null : c.overlay,
      fundo: c.fundo && c.fundo.tipo !== "cor" && c.fundo.valor === a.url ? null : c.fundo,
      midia: c.midia?.url === a.url ? null : c.midia,
      vinheta: c.vinheta?.url === a.url ? null : c.vinheta,
    }));
    await carregar();
  };

  return (
    <div className="flex flex-col gap-6">
      <MensagemErro>{aviso}</MensagemErro>

      <Secao titulo="Logotipo">
        {podeEnviar && <Envio tipo="logo" aoEnviar={carregar} rotulo="Enviar logo (PNG, JPG ou WebP)" />}
        <Biblioteca
          itens={doTipo("logo")}
          emUso={(a) => cena.logo?.url === a.url}
          aoUsar={(a) => alterar((c) => ({ ...c, logo: { url: a.url, posicao: c.logo?.posicao ?? "sd" } }))}
          aoTirar={() => alterar((c) => ({ ...c, logo: null }))}
          aoExcluir={excluir}
        />
        {cena.logo && (
          <div role="radiogroup" aria-label="Posição do logo" className="grid grid-cols-2 gap-1">
            {POSICOES.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={cena.logo?.posicao === p.id}
                onClick={() => alterar((c) => ({ ...c, logo: c.logo && { ...c.logo, posicao: p.id } }))}
                className={`rounded px-2 py-1.5 text-xs font-medium ${cena.logo?.posicao === p.id ? "bg-destaque/20 ring-1 ring-destaque" : "bg-white/[0.05] hover:bg-white/10"}`}
              >
                {p.nome}
              </button>
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo="Overlay" dica="PNG transparente feito para 1920×1080, por cima de tudo.">
        {podeEnviar && <Envio tipo="overlay" aoEnviar={carregar} rotulo="Enviar overlay (PNG)" />}
        <Biblioteca
          itens={doTipo("overlay")}
          emUso={(a) => cena.overlay === a.url}
          aoUsar={(a) => alterar((c) => ({ ...c, overlay: a.url }))}
          aoTirar={() => alterar((c) => ({ ...c, overlay: null }))}
          aoExcluir={excluir}
        />
      </Secao>

      <Secao titulo="Plano de fundo">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => alterar((c) => ({ ...c, fundo: null }))}
            aria-pressed={cena.fundo === null}
            className={`rounded-md px-3 py-2 text-sm font-medium ${cena.fundo === null ? "bg-destaque/20 ring-1 ring-destaque" : "bg-white/[0.05] hover:bg-white/10"}`}
          >
            Degradê da marca
          </button>
          <CorDeFundo cena={cena} alterar={alterar} />
        </div>
        {podeEnviar && <Envio tipo="fundo" aoEnviar={carregar} rotulo="Enviar imagem ou vídeo em loop" />}
        <Biblioteca
          itens={doTipo("fundo")}
          emUso={(a) => cena.fundo?.tipo !== "cor" && cena.fundo?.valor === a.url}
          aoUsar={(a) => alterar((c) => ({ ...c, fundo: { tipo: ehVideo(a.mime) ? "video" : "imagem", valor: a.url } }))}
          aoTirar={() => alterar((c) => ({ ...c, fundo: null }))}
          aoExcluir={excluir}
        />
      </Secao>

      <Secao titulo="Mídias" dica="Tocam em tela cheia, com som na live. O intervalo usa a mais recente de “Volto logo”.">
        {podeEnviar && <EnvioMidia aoEnviar={carregar} />}
        {CATEGORIAS.map((cat) => {
          const itens = doTipo("midia").filter((a) => (a.categoria ?? "outras") === cat.id);
          if (itens.length === 0) return null;
          return (
            <div key={cat.id} className="flex flex-col gap-1.5">
              <h4 className="text-xs font-semibold text-texto-suave">{cat.nome}</h4>
              <Biblioteca
                itens={itens}
                emUso={(a) => cena.midia?.url === a.url}
                rotuloUsar="Mostrar"
                aoUsar={(a) =>
                  alterar((c) => ({
                    ...c,
                    midia: { url: a.url, video: ehVideo(a.mime), loop: cat.id === "volto-logo", inicioEm: Date.now() },
                  }))
                }
                rotuloTirar="Parar"
                aoTirar={() => alterar((c) => ({ ...c, midia: null }))}
                aoExcluir={excluir}
              />
            </div>
          );
        })}
      </Secao>

      <Secao titulo="Vinhetas" dica="Vídeo curto com som, tocado uma vez por cima de tudo.">
        {podeEnviar && <Envio tipo="vinheta" aoEnviar={carregar} rotulo="Enviar vinheta (MP4 ou WebM)" />}
        <Biblioteca
          itens={doTipo("vinheta")}
          emUso={(a) => cena.vinheta?.url === a.url}
          rotuloUsar="Tocar"
          aoUsar={(a) => alterar((c) => ({ ...c, vinheta: { url: a.url, inicioEm: Date.now() } }))}
          rotuloTirar="Parar"
          aoTirar={() => alterar((c) => ({ ...c, vinheta: null }))}
          aoExcluir={excluir}
        />
      </Secao>
    </div>
  );
}

export function Secao({ titulo, dica, children }: { titulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div>
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {dica && <p className="text-xs text-texto-suave">{dica}</p>}
      </div>
      {children}
    </section>
  );
}

function CorDeFundo({ cena, alterar }: { cena: Cena; alterar: Alterar }) {
  const atual = cena.fundo?.tipo === "cor" ? cena.fundo.valor : "#0a1020";
  const espera = useRef<number | undefined>(undefined);
  return (
    <label
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium ${cena.fundo?.tipo === "cor" ? "bg-destaque/20 ring-1 ring-destaque" : "bg-white/[0.05]"}`}
    >
      <input
        type="color"
        defaultValue={atual}
        onChange={(e) => {
          const valor = e.target.value;
          window.clearTimeout(espera.current);
          espera.current = window.setTimeout(() => alterar((c) => ({ ...c, fundo: { tipo: "cor", valor } })), 350);
        }}
        className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      Cor sólida
    </label>
  );
}

export function Envio({ tipo, rotulo, aoEnviar }: { tipo: TipoAtivo; rotulo: string; aoEnviar: () => void }) {
  const { enviar, enviando, erro } = useEnvioAtivo(aoEnviar);
  return (
    <div className="flex flex-col gap-1">
      <label
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-white/20 px-3 py-2.5 text-sm text-texto-suave hover:border-white/40 hover:text-texto ${enviando ? "pointer-events-none opacity-60" : ""}`}
      >
        <UploadSimple weight="bold" className="size-4" aria-hidden />
        {enviando ? "Enviando…" : rotulo}
        <input
          type="file"
          accept={ACEITOS[tipo].join(",")}
          className="sr-only"
          disabled={enviando}
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            e.target.value = "";
            if (arquivo) void enviar(arquivo, tipo);
          }}
        />
      </label>
      <MensagemErro>{erro}</MensagemErro>
    </div>
  );
}

function EnvioMidia({ aoEnviar }: { aoEnviar: () => void }) {
  const [categoria, setCategoria] = useState<CategoriaMidia>("volto-logo");
  const { enviar, enviando, erro } = useEnvioAtivo(aoEnviar);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <label htmlFor="categoria-midia" className="sr-only">
          Momento da mídia
        </label>
        <select
          id="categoria-midia"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaMidia)}
          className="min-h-10 rounded-md border border-white/10 bg-black/20 px-2 text-sm"
        >
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <label
          className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-white/20 px-3 text-sm text-texto-suave hover:border-white/40 hover:text-texto ${enviando ? "pointer-events-none opacity-60" : ""}`}
        >
          <UploadSimple weight="bold" className="size-4" aria-hidden />
          {enviando ? "Enviando…" : "Enviar vídeo ou imagem"}
          <input
            type="file"
            accept={ACEITOS.midia.join(",")}
            className="sr-only"
            disabled={enviando}
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              e.target.value = "";
              if (arquivo) void enviar(arquivo, "midia", categoria);
            }}
          />
        </label>
      </div>
      <MensagemErro>{erro}</MensagemErro>
    </div>
  );
}

type PropsBiblioteca = {
  itens: Ativo[];
  emUso: (a: Ativo) => boolean;
  aoUsar: (a: Ativo) => void;
  aoTirar: () => void;
  aoExcluir: (a: Ativo) => void;
  rotuloUsar?: string;
  rotuloTirar?: string;
};

function Biblioteca({ itens, emUso, aoUsar, aoTirar, aoExcluir, rotuloUsar = "Usar", rotuloTirar = "Tirar" }: PropsBiblioteca) {
  if (itens.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {itens.map((a) => {
        const ativo = emUso(a);
        return (
          <li
            key={a.id}
            className={`flex items-center gap-2 rounded-md p-1.5 text-sm ${ativo ? "bg-destaque/10 ring-1 ring-destaque/30 ring-inset" : "bg-white/[0.04]"}`}
          >
            <span className="flex h-9 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-black/40">
              {ehVideo(a.mime) ? (
                <video src={`${a.url}#t=0.5`} muted preload="metadata" className="size-full object-cover" />
              ) : a.mime.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element -- miniatura do próprio arquivo
                <img src={a.url} alt="" className="size-full object-contain" />
              ) : (
                <FilmStrip weight="bold" className="size-4 text-texto-suave" aria-hidden />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{a.nome}</span>
              {a.duracao && <span className="text-xs text-texto-suave">{Math.round(a.duracao)} s</span>}
            </span>
            <button
              type="button"
              onClick={() => (ativo ? aoTirar() : aoUsar(a))}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${ativo ? "text-ensaio hover:bg-ensaio/10" : "text-destaque hover:bg-destaque/10"}`}
            >
              {ativo ? <Stop weight="bold" className="size-3.5" /> : <Play weight="bold" className="size-3.5" />}
              {ativo ? rotuloTirar : rotuloUsar}
            </button>
            <button
              type="button"
              aria-label={`Excluir ${a.nome}`}
              onClick={() => aoExcluir(a)}
              className="rounded p-1 text-texto-suave hover:bg-no-ar/15 hover:text-no-ar"
            >
              <Trash weight="bold" className="size-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
