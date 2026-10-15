"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Lightning, SpeakerHigh, Stop, X } from "@phosphor-icons/react";
import { listarAtivos, type Ativo } from "@/lib/acoes/ativos";
import { efeitoTocando, ouvirEfeitos, versaoDosEfeitos } from "@/lib/audioLive";
import { lerVolumeEfeitos, useDispararEfeito } from "@/hooks/useEfeitos";

/** Quantos efeitos têm tecla de atalho (1 a 9). */
const COM_TECLA = 9;

/** A tecla não vale quando a pessoa está digitando (chat, recado, banner…). */
function digitando(alvo: EventTarget | null) {
  if (!(alvo instanceof HTMLElement)) return false;
  return alvo.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName);
}

/**
 * Efeitos à mão durante a live: botão no menu de cima abre a grade, e as teclas 1 a 9
 * disparam os nove primeiros de qualquer lugar do estúdio (fora de campos de texto).
 * A ordem é a mesma da aba Áudio. `sala`: diretor delegado (biblioteca do dono).
 */
export function AtalhoEfeitos({ sala }: { sala?: { transmissaoId: string; codigo: string } }) {
  const [aberto, setAberto] = useState(false);
  const [efeitos, setEfeitos] = useState<Ativo[]>([]);
  const [erro, setErro] = useState<string>();
  const disparar = useDispararEfeito();
  const caixa = useRef<HTMLDivElement>(null);
  useSyncExternalStore(ouvirEfeitos, versaoDosEfeitos, () => 0);

  // Carrega ao entrar e de novo a cada abertura (pega efeitos enviados na aba Áudio).
  useEffect(() => {
    let vivo = true;
    void listarAtivos(sala).then((r) => {
      if (vivo) setEfeitos((r.ativos ?? []).filter((a) => a.tipo === "efeito"));
    });
    return () => {
      vivo = false;
    };
  }, [sala, aberto]);

  async function tocar(a: Ativo) {
    setErro(undefined);
    try {
      await disparar(a.url, lerVolumeEfeitos());
    } catch {
      setErro("Não foi possível tocar. Verifique a conexão.");
    }
  }

  // Teclas 1 a 9 (sem Ctrl/Alt/Cmd); Esc fecha a grade.
  const tocarRef = useRef(tocar);
  useEffect(() => {
    tocarRef.current = tocar;
  });
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
      if (e.ctrlKey || e.altKey || e.metaKey || e.repeat || digitando(e.target)) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > COM_TECLA) return;
      const alvo = efeitos[n - 1];
      if (!alvo) return;
      e.preventDefault();
      void tocarRef.current(alvo);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [efeitos]);

  // Clicar fora fecha.
  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: PointerEvent) => {
      if (caixa.current && e.target instanceof Node && !caixa.current.contains(e.target)) setAberto(false);
    };
    window.addEventListener("pointerdown", aoClicar);
    return () => window.removeEventListener("pointerdown", aoClicar);
  }, [aberto]);

  const algumTocando = efeitos.some((a) => efeitoTocando(a.url));

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        title="Efeitos sonoros (teclas 1 a 9)"
        className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold ring-1 ring-inset ${
          aberto || algumTocando ? "bg-destaque/20 ring-destaque" : "bg-white/[0.06] ring-white/10 hover:bg-white/10"
        }`}
      >
        <Lightning weight="bold" className="size-4" aria-hidden />
        Efeitos
      </button>
      {aberto && (
        <div
          role="dialog"
          aria-label="Efeitos sonoros"
          className="vidro-forte absolute top-full right-0 z-40 mt-2 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-2 rounded-xl p-3 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Efeitos sonoros</p>
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="rounded-md p-1 text-texto-suave hover:bg-white/10 hover:text-texto">
              <X weight="bold" className="size-4" />
            </button>
          </div>
          {erro && (
            <p role="alert" className="text-xs text-no-ar">
              {erro}
            </p>
          )}
          {efeitos.length === 0 ? (
            <p className="text-sm text-texto-suave">Nenhum efeito ainda. Envie na aba Áudio.</p>
          ) : (
            <ul className="grid max-h-[60dvh] grid-cols-3 gap-1.5 overflow-y-auto">
              {efeitos.map((a, i) => {
                const tocando = efeitoTocando(a.url);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => void tocar(a)}
                      aria-pressed={tocando}
                      title={tocando ? "Clique para cortar" : "Clique para tocar"}
                      className={`relative flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-xs font-semibold ring-1 ring-inset ${
                        tocando ? "bg-destaque/25 ring-destaque" : "bg-white/[0.06] ring-white/10 hover:bg-white/10"
                      }`}
                    >
                      {i < COM_TECLA && (
                        <kbd className="absolute top-1 left-1 rounded bg-black/40 px-1 text-[0.65rem] font-semibold text-texto-suave tabular-nums">
                          {i + 1}
                        </kbd>
                      )}
                      {tocando ? (
                        <Stop weight="bold" className="size-4 text-destaque" aria-hidden />
                      ) : (
                        <SpeakerHigh weight="bold" className="size-4 text-destaque" aria-hidden />
                      )}
                      <span className="line-clamp-2 text-center break-all">{a.nome}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-xs text-texto-suave">Teclas 1 a 9 tocam os primeiros, de qualquer lugar do estúdio. Clicar de novo corta.</p>
        </div>
      )}
    </div>
  );
}
