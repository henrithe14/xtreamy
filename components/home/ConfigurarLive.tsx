"use client";

import { useActionState, useEffect, useState } from "react";
import { GearSix, Image as IconeImagem } from "@phosphor-icons/react";
import { carregarCategorias, salvarConfigLive, type EstadoConfigLive } from "@/lib/acoes/configLive";
import type { Transmissao } from "@/lib/transmissoes";
import { IDIOMAS, LIMITE_TAGS } from "@/lib/validacao";
import type { Categoria } from "@/lib/youtube";
import { Botao } from "@/components/ui/Botao";
import { AreaTexto, CampoTexto, MensagemErro } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { Selecao } from "@/components/ui/Selecao";

type DadosLive = Pick<
  Transmissao,
  "id" | "titulo" | "descricao" | "privacidade" | "agendada_para" | "categoria_id" | "tags" | "idioma" | "youtube_broadcast_id"
>;

const PRIVACIDADES = [
  { valor: "nao_listada", rotulo: "Não listada" },
  { valor: "publica", rotulo: "Pública" },
  { valor: "privada", rotulo: "Privada" },
] as const;

/** ISO → valor do input datetime-local, no fuso do navegador. */
function paraLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ConfigurarLive({ live }: { live: DadosLive }) {
  const [aberto, setAberto] = useState(false);
  const [rodada, setRodada] = useState(0);

  return (
    <>
      <Botao
        variante="secundario"
        onClick={() => {
          setRodada((r) => r + 1);
          setAberto(true);
        }}
      >
        <GearSix weight="fill" aria-hidden />
        Configurar live
      </Botao>
      <Dialogo aberto={aberto} aoFechar={() => setAberto(false)} titulo="Configurar live no YouTube">
        {aberto && <Formulario key={rodada} live={live} aoSalvar={() => setAberto(false)} />}
      </Dialogo>
    </>
  );
}

function Formulario({ live, aoSalvar }: { live: DadosLive; aoSalvar: () => void }) {
  const [categorias, setCategorias] = useState<Categoria[]>();
  const [erroCategorias, setErroCategorias] = useState<string>();
  const [capa, setCapa] = useState<string>();
  const [agendada, setAgendada] = useState(paraLocal(live.agendada_para));
  const [estado, acao, salvando] = useActionState<EstadoConfigLive, FormData>(
    salvarConfigLive.bind(null, live.id),
    { tipo: "inicial" },
  );

  useEffect(() => {
    let cancelado = false;
    void carregarCategorias(live.id).then((r) => {
      if (cancelado) return;
      if (r.categorias) setCategorias(r.categorias);
      else setErroCategorias(r.erro);
    });
    return () => {
      cancelado = true;
    };
  }, [live.id]);

  useEffect(() => {
    if (estado.tipo === "salvo" && !estado.aviso) aoSalvar();
  }, [estado, aoSalvar]);

  useEffect(() => () => {
    if (capa) URL.revokeObjectURL(capa);
  }, [capa]);

  // O horário vai em ISO (UTC): o servidor não precisa adivinhar o fuso.
  const dataAgendada = agendada ? new Date(agendada) : null;
  const agendadaIso = dataAgendada && !Number.isNaN(dataAgendada.getTime()) ? dataAgendada.toISOString() : "";
  const capaAtual = live.youtube_broadcast_id ? `https://i.ytimg.com/vi/${live.youtube_broadcast_id}/hqdefault.jpg` : undefined;

  return (
    <form action={acao} className="flex max-h-[70dvh] flex-col gap-5 overflow-y-auto pr-1">
      <CampoTexto id="cfg-titulo" name="titulo" rotulo="Título" required maxLength={100} defaultValue={live.titulo} />
      <AreaTexto id="cfg-descricao" name="descricao" rotulo="Descrição" maxLength={5000} defaultValue={live.descricao} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Selecao id="cfg-privacidade" name="privacidade" rotulo="Privacidade" defaultValue={live.privacidade}>
          {PRIVACIDADES.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.rotulo}
            </option>
          ))}
        </Selecao>
        <CampoTexto
          id="cfg-agendada"
          type="datetime-local"
          rotulo="Início previsto (opcional)"
          value={agendada}
          onChange={(e) => setAgendada(e.target.value)}
        />
        <input type="hidden" name="agendada_para" value={agendadaIso} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Selecao
          id="cfg-categoria"
          name="categoria_id"
          rotulo="Categoria"
          defaultValue={live.categoria_id ?? ""}
          disabled={!categorias}
          key={categorias ? "carregadas" : "carregando"}
        >
          <option value="">{categorias ? "Pessoas e blogs (padrão)" : "Carregando categorias…"}</option>
          {categorias?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Selecao>
        <Selecao id="cfg-idioma" name="idioma" rotulo="Idioma" defaultValue={live.idioma}>
          {IDIOMAS.map((i) => (
            <option key={i.codigo} value={i.codigo}>
              {i.nome}
            </option>
          ))}
        </Selecao>
      </div>
      {erroCategorias && <p className="-mt-3 text-xs text-ensaio">{erroCategorias}</p>}

      <CampoTexto
        id="cfg-tags"
        name="tags"
        rotulo="Tags"
        defaultValue={live.tags.join(", ")}
        placeholder="futebol, ao vivo, comentários"
        dica={`Separe por vírgula. Até ${LIMITE_TAGS} caracteres no total.`}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="cfg-capa" className="text-sm font-medium">
          Capa
        </label>
        <div className="flex items-center gap-4">
          <div className="flex aspect-video w-40 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/30 ring-1 ring-white/10">
            {capa || capaAtual ? (
              // eslint-disable-next-line @next/next/no-img-element -- prévia local/miniatura do YouTube
              <img src={capa ?? capaAtual} alt="Capa da live" className="size-full object-cover" />
            ) : (
              <IconeImagem weight="fill" className="size-8 text-texto-suave" aria-hidden />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <input
              id="cfg-capa"
              name="capa"
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                setCapa(arquivo ? URL.createObjectURL(arquivo) : undefined);
              }}
              className="max-w-full text-sm text-texto-suave file:mr-3 file:rounded-md file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:font-semibold file:text-texto hover:file:bg-white/[0.12]"
            />
            <p className="text-xs text-texto-suave">JPG ou PNG, até 2 MB, de preferência 1280×720.</p>
          </div>
        </div>
      </div>

      {estado.tipo === "salvo" && estado.aviso && (
        <p role="status" className="rounded-md bg-ensaio/10 px-3 py-2 text-sm text-ensaio">
          Configurações salvas. {estado.aviso}
        </p>
      )}
      <MensagemErro>{estado.tipo === "erro" ? estado.mensagem : undefined}</MensagemErro>
      <Botao type="submit" disabled={salvando}>
        {salvando ? "Salvando no YouTube…" : "Salvar no YouTube"}
      </Botao>
    </form>
  );
}
