"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { FloppyDisk, Trash } from "@phosphor-icons/react";
import { excluirEstilo, listarEstilos, salvarEstilo, type EstiloSalvo } from "@/lib/acoes/artes";
import type { Cena, CoresMarca } from "@/lib/cena";
import { FONTES, FORMATOS, TEMAS, type Estilo, type Tema } from "@/lib/estilo";
import { Botao } from "@/components/ui/Botao";
import { MensagemErro } from "@/components/ui/Campo";
import { Selecao } from "@/components/ui/Selecao";

type Alterar = (mudanca: (atual: Cena) => Omit<Cena, "versao">) => void;

/** Aba Estilo do diretor: tudo muda a prévia e a live na hora. */
export function PainelEstilo({ cena, alterar }: { cena: Cena; alterar: Alterar }) {
  const mudarEstilo = (parcial: Partial<Estilo>) => alterar((c) => ({ ...c, estilo: { ...c.estilo, ...parcial } }));
  const mudarCamera = (parcial: Partial<Estilo["camera"]>) =>
    alterar((c) => ({ ...c, estilo: { ...c.estilo, camera: { ...c.estilo.camera, ...parcial } } }));

  return (
    <div className="flex flex-col gap-5">
      <Secao titulo="Cores da marca">
        <div className="grid grid-cols-2 gap-3">
          <SeletorCor
            rotulo="Primária"
            valor={cena.cores.primaria}
            aoMudar={(primaria) => alterar((c) => ({ ...c, cores: { ...c.cores, primaria } }))}
          />
          <SeletorCor
            rotulo="Secundária"
            valor={cena.cores.secundaria}
            aoMudar={(secundaria) => alterar((c) => ({ ...c, cores: { ...c.cores, secundaria } }))}
          />
        </div>
        <p className="text-xs text-texto-suave">Mudam o fundo padrão, as etiquetas, os banners e os comentários.</p>
      </Secao>

      <Secao titulo="Tema das artes">
        <div role="radiogroup" aria-label="Tema" className="grid grid-cols-2 gap-2">
          {TEMAS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={cena.estilo.tema === t.id}
              onClick={() => mudarEstilo({ tema: t.id })}
              className={`flex flex-col gap-2 rounded-md p-2 text-left transition-colors ${
                cena.estilo.tema === t.id ? "bg-destaque/15 ring-2 ring-destaque" : "bg-white/[0.04] ring-1 ring-white/10 hover:bg-white/[0.08]"
              }`}
            >
              <MiniTema tema={t.id} cores={cena.cores} />
              <span className="text-sm font-semibold">{t.nome}</span>
              <span className="text-xs text-texto-suave">{t.descricao}</span>
            </button>
          ))}
        </div>
      </Secao>

      <Secao titulo="Fonte">
        <Selecao id="fonte" rotulo="Fonte das artes" value={cena.estilo.fonte} onChange={(e) => mudarEstilo({ fonte: e.target.value })}>
          {FONTES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Selecao>
      </Secao>

      <Secao titulo="Câmera">
        <div role="radiogroup" aria-label="Formato da câmera" className="flex gap-2">
          {FORMATOS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={cena.estilo.camera.formato === f.id}
              onClick={() => mudarCamera({ formato: f.id })}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-md p-2 text-xs font-semibold ${
                cena.estilo.camera.formato === f.id ? "bg-destaque/15 ring-2 ring-destaque" : "bg-white/[0.04] ring-1 ring-white/10 hover:bg-white/[0.08]"
              }`}
            >
              <span
                aria-hidden
                className={`block h-7 bg-white/40 ${f.id === "circulo" ? "w-7 rounded-full" : f.id === "arredondado" ? "w-12 rounded-md" : "w-12"}`}
              />
              {f.nome}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Borda: {cena.estilo.camera.borda === 0 ? "sem borda" : `${cena.estilo.camera.borda}px`}
            <ControleDeslizante valor={cena.estilo.camera.borda} aoMudar={(borda) => mudarCamera({ borda })} />
          </label>
          <SeletorCor rotulo="Cor da borda" valor={cena.estilo.camera.corBorda} aoMudar={(corBorda) => mudarCamera({ corBorda })} compacto />
        </div>
      </Secao>

      <EstilosSalvos cena={cena} alterar={alterar} />
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      {children}
    </section>
  );
}

/**
 * Cor com aplicação adiada: o seletor nativo dispara a cada movimento; a cena só
 * muda quando a pessoa para de arrastar (evita uma enxurrada de pedidos).
 */
function SeletorCor({ rotulo, valor, aoMudar, compacto }: { rotulo: string; valor: string; aoMudar: (cor: string) => void; compacto?: boolean }) {
  const [local, setLocal] = useState(valor);
  const espera = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Mantém em dia quando a cena muda por fora (ex.: aplicar estilo salvo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(valor);
  }, [valor]);

  return (
    <label className={`flex items-center gap-2 text-sm font-medium ${compacto ? "" : "rounded-md bg-white/[0.04] p-2 ring-1 ring-white/10"}`}>
      <input
        type="color"
        value={local}
        onChange={(e) => {
          const cor = e.target.value;
          setLocal(cor);
          window.clearTimeout(espera.current);
          espera.current = window.setTimeout(() => aoMudar(cor), 350);
        }}
        className="size-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <span className="min-w-0">
        <span className="block">{rotulo}</span>
        {!compacto && <span className="block font-mono text-xs text-texto-suave">{local.toUpperCase()}</span>}
      </span>
    </label>
  );
}

function ControleDeslizante({ valor, aoMudar }: { valor: number; aoMudar: (v: number) => void }) {
  const [local, setLocal] = useState(valor);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(valor);
  }, [valor]);
  return (
    <input
      type="range"
      min={0}
      max={12}
      step={1}
      value={local}
      onChange={(e) => setLocal(Number(e.target.value))}
      // Aplica ao soltar (mouse ou toque), não a cada passo.
      onPointerUp={() => local !== valor && aoMudar(local)}
      onKeyUp={() => local !== valor && aoMudar(local)}
      className="w-full accent-destaque"
    />
  );
}

/** Miniatura de uma etiqueta no tema, com as cores atuais. */
function MiniTema({ tema, cores }: { tema: Tema; cores: CoresMarca }) {
  const base = "h-9 w-full rounded-sm bg-black/40 p-1.5";
  if (tema === "bolha")
    return (
      <div className={base}>
        <span className="block h-full w-3/4 rounded-full" style={{ background: cores.primaria }} />
      </div>
    );
  if (tema === "minimo")
    return (
      <div className={`${base} flex flex-col justify-center gap-1`}>
        <span className="block h-1.5 w-2/3 rounded-sm bg-white/90" />
        <span className="block h-0.5 w-4" style={{ background: cores.primaria }} />
      </div>
    );
  if (tema === "bloco")
    return (
      <div className={`${base} flex flex-col`}>
        <span className="block h-1/2 w-3/4" style={{ background: cores.primaria }} />
        <span className="block h-1/2 w-1/2" style={{ background: cores.secundaria }} />
      </div>
    );
  return (
    <div className={base}>
      <span className="block h-full w-3/4 border-l-4 bg-[rgb(8_11_20/0.9)]" style={{ borderColor: cores.primaria }} />
    </div>
  );
}

function EstilosSalvos({ cena, alterar }: { cena: Cena; alterar: Alterar }) {
  const [estilos, setEstilos] = useState<EstiloSalvo[]>();
  const [aviso, setAviso] = useState<string>();
  const [nome, setNome] = useState("");
  const [salvando, iniciar] = useTransition();

  async function carregar() {
    const r = await listarEstilos();
    setEstilos(r.estilos ?? []);
    setAviso(r.erro);
  }

  useEffect(() => {
    void listarEstilos().then((r) => {
      setEstilos(r.estilos ?? []);
      setAviso(r.erro);
    });
  }, []);

  return (
    <Secao titulo="Estilos salvos">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          iniciar(async () => {
            const r = await salvarEstilo(nome, cena.estilo, cena.cores);
            if (r.erro) setAviso(r.erro);
            else {
              setNome("");
              await carregar();
            }
          });
        }}
      >
        <label htmlFor="nome-estilo" className="sr-only">
          Nome do estilo
        </label>
        <input
          id="nome-estilo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={60}
          placeholder="Nome para o estilo atual"
          className="min-h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-3 text-sm focus:border-destaque focus:outline-none"
        />
        <Botao type="submit" variante="secundario" disabled={salvando || !nome.trim()}>
          <FloppyDisk weight="bold" aria-hidden />
          Salvar
        </Botao>
      </form>
      <MensagemErro>{aviso}</MensagemErro>
      {estilos && estilos.length > 0 && (
        <ul className="flex flex-col gap-1">
          {estilos.map((e) => (
            <li key={e.id} className="flex items-center gap-2 rounded-md bg-white/[0.04] px-2 py-1.5 text-sm">
              <span className="flex shrink-0 gap-0.5" aria-hidden>
                <span className="size-3.5 rounded-sm" style={{ background: e.cores.primaria }} />
                <span className="size-3.5 rounded-sm" style={{ background: e.cores.secundaria }} />
              </span>
              <span className="min-w-0 flex-1 truncate">{e.nome}</span>
              <button
                type="button"
                onClick={() => alterar((c) => ({ ...c, estilo: e.estilo, cores: e.cores }))}
                className="rounded px-2 py-1 text-xs font-semibold text-destaque hover:bg-destaque/10"
              >
                Aplicar
              </button>
              <button
                type="button"
                aria-label={`Excluir estilo ${e.nome}`}
                onClick={() => void excluirEstilo(e.id).then(carregar)}
                className="rounded p-1 text-texto-suave hover:bg-no-ar/15 hover:text-no-ar"
              >
                <Trash weight="bold" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Secao>
  );
}
