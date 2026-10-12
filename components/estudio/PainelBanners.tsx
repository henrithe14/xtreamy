"use client";

import { useEffect, useState, useTransition } from "react";
import { Eye, EyeSlash, FloppyDisk, Trash } from "@phosphor-icons/react";
import { excluirBanner, listarBanners, salvarBanner, type BannerSalvo } from "@/lib/acoes/artes";
import type { Cena } from "@/lib/cena";
import { LIMITE_BANNER, type Banner, type EstiloBanner } from "@/lib/estilo";
import { Botao } from "@/components/ui/Botao";
import { AreaTexto, MensagemErro } from "@/components/ui/Campo";

type Alterar = (mudanca: (atual: Cena) => Omit<Cena, "versao">) => void;

const ESTILOS: { id: EstiloBanner; nome: string; dica: string }[] = [
  { id: "faixa", nome: "Faixa fixa", dica: "Texto parado na base da tela" },
  { id: "letreiro", nome: "Letreiro", dica: "Texto rolando, bom para recados longos" },
];

const mesmo = (a: Banner | null, b: Banner) => a !== null && a.texto === b.texto && a.estilo === b.estilo;

/** Aba Banners do diretor: criar, salvar, mostrar e ocultar. */
/** `salvos`: lista salva só para o dono (o diretor delegado não tem login). */
export function PainelBanners({ cena, alterar, salvos: comSalvos = true }: { cena: Cena; alterar: Alterar; salvos?: boolean }) {
  const [texto, setTexto] = useState("");
  const [estilo, setEstilo] = useState<EstiloBanner>("faixa");
  const [salvos, setSalvos] = useState<BannerSalvo[]>();
  const [aviso, setAviso] = useState<string>();
  const [salvando, iniciar] = useTransition();

  const mostrar = (b: Banner) => alterar((c) => ({ ...c, banner: { texto: b.texto.trim(), estilo: b.estilo } }));
  const ocultar = () => alterar((c) => ({ ...c, banner: null }));

  async function carregar() {
    const r = await listarBanners();
    setSalvos(r.banners ?? []);
    setAviso(r.erro);
  }

  useEffect(() => {
    if (!comSalvos) return;
    void listarBanners().then((r) => {
      setSalvos(r.banners ?? []);
      setAviso(r.erro);
    });
  }, [comSalvos]);

  return (
    <div className="flex flex-col gap-5">
      {cena.banner && (
        <div className="flex items-start gap-2 rounded-lg bg-destaque/10 p-2.5 text-sm ring-1 ring-destaque/30 ring-inset">
          <Eye weight="bold" className="mt-0.5 size-4 shrink-0 text-destaque" aria-hidden />
          <p className="min-w-0 flex-1">
            <span className="font-semibold">Na tela ({cena.banner.estilo === "faixa" ? "faixa" : "letreiro"})</span>
            <span className="line-clamp-2 text-texto-suave">{cena.banner.texto}</span>
          </p>
          <button type="button" onClick={ocultar} className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold hover:bg-white/10">
            Ocultar
          </button>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <AreaTexto
          id="texto-banner"
          rotulo="Novo banner"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={LIMITE_BANNER}
          placeholder="Ex.: Siga o canal e ative o sininho"
          className="min-h-20"
          dica={`${texto.length}/${LIMITE_BANNER}`}
        />
        <div role="radiogroup" aria-label="Estilo do banner" className="grid grid-cols-2 gap-2">
          {ESTILOS.map((e) => (
            <button
              key={e.id}
              type="button"
              role="radio"
              aria-checked={estilo === e.id}
              onClick={() => setEstilo(e.id)}
              className={`rounded-md p-2 text-left ${estilo === e.id ? "bg-destaque/15 ring-2 ring-destaque" : "bg-white/[0.04] ring-1 ring-white/10 hover:bg-white/[0.08]"}`}
            >
              <span className="block text-sm font-semibold">{e.nome}</span>
              <span className="block text-xs text-texto-suave">{e.dica}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao onClick={() => mostrar({ texto, estilo })} disabled={!texto.trim()}>
            <Eye weight="bold" aria-hidden />
            Mostrar agora
          </Botao>
          {comSalvos && (
          <Botao
            variante="secundario"
            disabled={salvando || !texto.trim()}
            onClick={() =>
              iniciar(async () => {
                const r = await salvarBanner({ texto, estilo });
                if (r.erro) setAviso(r.erro);
                else {
                  setTexto("");
                  await carregar();
                }
              })
            }
          >
            <FloppyDisk weight="bold" aria-hidden />
            Salvar para depois
          </Botao>
          )}
        </div>
        <MensagemErro>{aviso}</MensagemErro>
      </section>

      {salvos && salvos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Banners salvos</h3>
          <ul className="flex flex-col gap-1">
            {salvos.map((b) => {
              const naTela = mesmo(cena.banner, b);
              return (
                <li
                  key={b.id}
                  className={`flex items-start gap-2 rounded-md p-2 text-sm ${naTela ? "bg-destaque/10 ring-1 ring-destaque/30 ring-inset" : "bg-white/[0.04]"}`}
                >
                  <p className="min-w-0 flex-1">
                    <span className="line-clamp-2">{b.texto}</span>
                    <span className="text-xs text-texto-suave">{b.estilo === "faixa" ? "Faixa fixa" : "Letreiro"}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => (naTela ? ocultar() : mostrar(b))}
                    aria-label={naTela ? "Ocultar da tela" : "Mostrar na tela"}
                    title={naTela ? "Ocultar da tela" : "Mostrar na tela"}
                    className={`rounded p-1.5 hover:bg-white/10 ${naTela ? "text-destaque" : ""}`}
                  >
                    {naTela ? <EyeSlash weight="bold" className="size-4" /> : <Eye weight="bold" className="size-4" />}
                  </button>
                  <button
                    type="button"
                    aria-label="Excluir banner"
                    onClick={() => void excluirBanner(b.id).then(carregar)}
                    className="rounded p-1.5 text-texto-suave hover:bg-no-ar/15 hover:text-no-ar"
                  >
                    <Trash weight="bold" className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
