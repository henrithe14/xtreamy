"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useChat } from "@livekit/components-react";
import { ArrowCounterClockwise, ChatCircleText, Eye, EyeSlash, PaperPlaneRight, Plus, Star, YoutubeLogo } from "@phosphor-icons/react";
import { useChatYoutube } from "@/hooks/useChatYoutube";
import { LIMITES_COMENTARIO, type ComentarioDestacado } from "@/lib/cena";
import { ehPonto } from "@/lib/participante";

type Destaque = {
  atual: ComentarioDestacado | null;
  mostrar: (c: ComentarioDestacado) => void;
  ocultar: () => void;
};

const igual = (a: ComentarioDestacado | null, autor: string, texto: string) =>
  a !== null && a.autor === autor && a.texto === texto.slice(0, LIMITES_COMENTARIO.texto);

/** Comentários do diretor: YouTube (pode destacar na tela) e chat interno do estúdio. */
type PropsPainel = {
  transmissaoId: string;
  /** Diretor delegado: o servidor confere a direção pelo convite. */
  codigo?: string;
  temChat: boolean;
  /** Id do vídeo da live: o chat do próprio YouTube aparece incorporado (não gasta cota). */
  videoYoutube?: string;
  destaque: Destaque;
};

/** Quanto tempo a "Inserção" lê o chat pela API antes de voltar ao chat incorporado. */
const INSERCAO_MS = 3 * 60_000;

export function PainelComentarios({ transmissaoId, codigo, temChat, videoYoutube, destaque }: PropsPainel) {
  const [aba, setAba] = useState<"youtube" | "estudio">(temChat ? "youtube" : "estudio");

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {destaque.atual && (
        <div className="flex items-start gap-2 rounded-lg bg-destaque/10 p-2.5 text-sm ring-1 ring-destaque/30 ring-inset">
          <Eye weight="bold" className="mt-0.5 size-4 shrink-0 text-destaque" aria-hidden />
          <p className="min-w-0 flex-1">
            <span className="font-semibold">Na tela: {destaque.atual.autor}</span>
            <span className="line-clamp-2 text-texto-suave">{destaque.atual.texto}</span>
          </p>
          <button type="button" onClick={destaque.ocultar} className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold hover:bg-white/10">
            Ocultar
          </button>
        </div>
      )}

      <div role="tablist" aria-label="Comentários" className="flex gap-1 rounded-md bg-black/20 p-1">
        <BotaoAba ativa={aba === "youtube"} onClick={() => setAba("youtube")}>
          <YoutubeLogo weight="bold" /> YouTube
        </BotaoAba>
        <BotaoAba ativa={aba === "estudio"} onClick={() => setAba("estudio")}>
          <ChatCircleText weight="bold" /> Estúdio
        </BotaoAba>
      </div>

      {aba === "youtube" ? (
        temChat ? (
          <ComentariosYoutube transmissaoId={transmissaoId} codigo={codigo} videoYoutube={videoYoutube} destaque={destaque} />
        ) : (
          <p className="text-sm text-texto-suave">Esta transmissão não tem canal do YouTube, então não há chat público.</p>
        )
      ) : (
        <ChatEstudio destaque={destaque} />
      )}
    </div>
  );
}

function BotaoAba({ ativa, onClick, children }: { ativa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={ativa}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm font-semibold [&_svg]:size-4 ${
        ativa ? "bg-white/10 text-texto" : "text-texto-suave hover:text-texto"
      }`}
    >
      {children}
    </button>
  );
}

/** Rola para o fim quando chegam mensagens, se a pessoa já estava no fim. */
function useRolarParaFim(dependencia: number) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTop = el.scrollHeight;
  }, [dependencia]);
  return ref;
}

/**
 * Chat do YouTube sem gastar a cota da API: o normal é o chat do próprio YouTube,
 * incorporado. "Inserção" liga a leitura pela API por alguns minutos, para escolher
 * comentários e mostrar na tela; depois volta sozinho ao chat incorporado.
 */
function ComentariosYoutube({
  transmissaoId,
  codigo,
  videoYoutube,
  destaque,
}: {
  transmissaoId: string;
  codigo?: string;
  videoYoutube?: string;
  destaque: Destaque;
}) {
  const [insercaoAte, setInsercaoAte] = useState<number | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [dominio, setDominio] = useState<string>();

  useEffect(() => {
    // O YouTube exige o domínio da página que incorpora o chat.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDominio(window.location.hostname);
  }, []);

  useEffect(() => {
    if (insercaoAte === null) return;
    const t = window.setInterval(() => {
      const instante = Date.now();
      setAgora(instante);
      if (instante >= insercaoAte) setInsercaoAte(null);
    }, 1000);
    return () => window.clearInterval(t);
  }, [insercaoAte]);

  const lendo = insercaoAte !== null || !videoYoutube;
  const falta = insercaoAte !== null ? Math.max(0, insercaoAte - agora) : 0;
  const minutos = Math.floor(falta / 60_000);
  const segundos = Math.floor((falta % 60_000) / 1000);

  return (
    <div className="flex min-h-0 flex-col gap-2">
      {insercaoAte !== null ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-destaque/10 px-2.5 py-2 text-xs ring-1 ring-destaque/30 ring-inset">
          <Star weight="bold" className="size-4 text-destaque" aria-hidden />
          <span className="flex-1">
            Inserção: escolha um comentário para a tela. Volta ao chat do YouTube em{" "}
            <span className="font-semibold tabular-nums">
              {minutos}:{String(segundos).padStart(2, "0")}
            </span>
            .
          </span>
          <button
            type="button"
            onClick={() => setInsercaoAte((ate) => (ate ?? Date.now()) + 2 * 60_000)}
            className="inline-flex items-center gap-1 rounded px-2 py-1 font-semibold hover:bg-white/10"
          >
            <Plus weight="bold" className="size-3.5" aria-hidden />2 min
          </button>
          {videoYoutube && (
            <button
              type="button"
              onClick={() => setInsercaoAte(null)}
              className="inline-flex items-center gap-1 rounded px-2 py-1 font-semibold hover:bg-white/10"
            >
              <ArrowCounterClockwise weight="bold" className="size-3.5" aria-hidden />
              Voltar
            </button>
          )}
        </div>
      ) : (
        videoYoutube && (
          <button
            type="button"
            onClick={() => {
              setAgora(Date.now());
              setInsercaoAte(Date.now() + INSERCAO_MS);
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-destaque px-3 text-sm font-semibold text-destaque-texto hover:brightness-110"
          >
            <Star weight="bold" className="size-4" aria-hidden />
            Inserção: escolher comentário para a tela
          </button>
        )
      )}
      {lendo ? (
        <ChatYoutube transmissaoId={transmissaoId} codigo={codigo} ativo destaque={destaque} />
      ) : (
        <>
          {dominio && (
            <iframe
              title="Chat ao vivo do YouTube"
              src={`https://www.youtube.com/live_chat?v=${encodeURIComponent(videoYoutube)}&embed_domain=${encodeURIComponent(dominio)}&dark_theme=1`}
              className="h-[min(60dvh,32rem)] w-full rounded-md bg-black/20"
            />
          )}
          <p className="text-xs text-texto-suave">
            Este é o chat do próprio YouTube (não gasta a cota da API). Ele só aparece com a live no ar ou agendada como
            pública ou não listada.
          </p>
        </>
      )}
    </div>
  );
}

type PropsChat = { transmissaoId: string; codigo?: string; ativo: boolean; destaque: Destaque };

function ChatYoutube({ transmissaoId, codigo, ativo, destaque }: PropsChat) {
  const { mensagens, erro, encerrado, carregando } = useChatYoutube(transmissaoId, ativo, codigo);
  const lista = useRolarParaFim(mensagens.length);

  return (
    <div className="flex min-h-0 flex-col gap-2">
      {erro && <p className="text-xs text-ensaio">{erro}</p>}
      {encerrado && !erro && <p className="text-xs text-texto-suave">O chat desta live foi encerrado.</p>}
      <ul ref={lista} className="flex max-h-[min(60dvh,32rem)] flex-col gap-1 overflow-y-auto pr-1" aria-live="polite">
        {carregando && <li className="text-sm text-texto-suave">Carregando o chat…</li>}
        {!carregando && mensagens.length === 0 && (
          <li className="text-sm text-texto-suave">Nenhum comentário ainda. Eles aparecem aqui assim que chegarem.</li>
        )}
        {mensagens.map((m) => (
          <ItemComentario
            key={m.id}
            autor={m.autor}
            avatar={m.avatar}
            texto={m.texto}
            selo={m.dono ? "Dono" : m.moderador ? "Moderador" : undefined}
            naTela={igual(destaque.atual, m.autor, m.texto)}
            aoMostrar={() => destaque.mostrar({ autor: m.autor, avatar: m.avatar, texto: m.texto.slice(0, LIMITES_COMENTARIO.texto), origem: "youtube" })}
            aoOcultar={destaque.ocultar}
          />
        ))}
      </ul>
    </div>
  );
}

/** Chat interno da sala (equipe e convidados). Nunca vai para a live, a não ser que o diretor destaque. */
export function ChatEstudio({ destaque }: { destaque?: Destaque }) {
  const { chatMessages, send, isSending } = useChat();
  const [texto, setTexto] = useState("");
  const lista = useRolarParaFim(chatMessages.length);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const mensagem = texto.trim();
    if (!mensagem) return;
    await send(mensagem.slice(0, 500));
    setTexto("");
  }

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <ul ref={lista} className="flex max-h-[min(50dvh,28rem)] flex-col gap-1 overflow-y-auto pr-1" aria-live="polite">
        {chatMessages.length === 0 && (
          <li className="text-sm text-texto-suave">Converse com a equipe aqui. Estas mensagens não aparecem na live.</li>
        )}
        {chatMessages
          .filter((m) => !m.from || !ehPonto(m.from.identity))
          .map((m) => {
            const autor = m.from?.name || "Participante";
            return (
              <ItemComentario
                key={m.id}
                autor={m.from?.isLocal ? `${autor} (você)` : autor}
                avatar={null}
                texto={m.message}
                naTela={destaque ? igual(destaque.atual, autor, m.message) : false}
                aoMostrar={
                  destaque
                    ? () => destaque.mostrar({ autor, avatar: null, texto: m.message.slice(0, LIMITES_COMENTARIO.texto), origem: "interno" })
                    : undefined
                }
                aoOcultar={destaque?.ocultar}
              />
            );
          })}
      </ul>
      <form onSubmit={enviar} className="flex gap-2">
        <label htmlFor="mensagem-estudio" className="sr-only">
          Mensagem para a equipe
        </label>
        <input
          id="mensagem-estudio"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={500}
          placeholder="Mensagem para a equipe"
          className="min-h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-3 text-sm focus:border-destaque focus:outline-none"
        />
        <button
          type="submit"
          disabled={isSending || !texto.trim()}
          aria-label="Enviar mensagem"
          className="flex size-10 items-center justify-center rounded-md bg-destaque text-destaque-texto hover:bg-destaque-forte disabled:opacity-40"
        >
          <PaperPlaneRight weight="bold" className="size-5" />
        </button>
      </form>
    </div>
  );
}

type PropsItem = {
  autor: string;
  avatar: string | null;
  texto: string;
  selo?: string;
  naTela: boolean;
  aoMostrar?: () => void;
  aoOcultar?: () => void;
};

function ItemComentario({ autor, avatar, texto, selo, naTela, aoMostrar, aoOcultar }: PropsItem) {
  return (
    <li
      className={`group flex items-start gap-2 rounded-md p-2 text-sm ${naTela ? "bg-destaque/10 ring-1 ring-destaque/30 ring-inset" : "hover:bg-white/[0.04]"}`}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto pequena do autor no YouTube
        <img src={avatar} alt="" className="size-7 shrink-0 rounded-full" referrerPolicy="no-referrer" />
      ) : (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
          {autor.trim()[0]?.toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-texto-suave">
          {autor}
          {selo && <span className="ml-1.5 rounded bg-white/10 px-1 text-[0.65rem] text-texto">{selo}</span>}
        </p>
        <p className="break-words">{texto}</p>
      </div>
      {aoMostrar && (
        <button
          type="button"
          onClick={naTela ? aoOcultar : aoMostrar}
          aria-label={naTela ? "Ocultar da tela" : "Mostrar na tela"}
          title={naTela ? "Ocultar da tela" : "Mostrar na tela"}
          className={`shrink-0 rounded-md p-1.5 transition-opacity hover:bg-white/10 ${naTela ? "text-destaque" : "[@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
        >
          {naTela ? <EyeSlash weight="bold" className="size-4" /> : <Eye weight="bold" className="size-4" />}
        </button>
      )}
    </li>
  );
}
