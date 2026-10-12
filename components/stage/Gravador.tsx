"use client";

import { DownloadSimple, Record, WarningCircle } from "@phosphor-icons/react";
import { useGravacao } from "@/hooks/useGravacao";

/**
 * Painel da janela de gravação (/stage?gravar=1). Some enquanto grava: tudo o que
 * aparece nesta aba entra no vídeo.
 */
export function Gravador({ alvo, aoComecar }: { alvo: React.RefObject<HTMLElement | null>; aoComecar: () => void }) {
  const { estado, erro, urlBaixar, nome, comecar } = useGravacao(alvo);

  if (estado === "gravando") return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="vidro-forte flex max-w-md flex-col gap-4 rounded-xl p-6 text-texto">
        {estado === "salvo" ? (
          <>
            <h1 className="text-lg font-semibold tracking-tight">Gravação concluída</h1>
            {urlBaixar ? (
              <a
                href={urlBaixar}
                download={nome}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-destaque px-4 font-semibold text-destaque-texto hover:bg-destaque-forte"
              >
                <DownloadSimple weight="bold" className="size-5" aria-hidden />
                Baixar vídeo
              </a>
            ) : (
              <p className="text-sm text-texto-suave">O vídeo foi salvo no arquivo que você escolheu ({nome}).</p>
            )}
            <p className="text-sm text-texto-suave">Pode fechar esta janela.</p>
          </>
        ) : estado === "salvando" ? (
          <p className="text-sm">Salvando o vídeo…</p>
        ) : (
          <>
            <h1 className="text-lg font-semibold tracking-tight">Gravar a live</h1>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-texto-suave">
              <li>Escolha onde salvar o arquivo (se o navegador perguntar).</li>
              <li>
                Escolha <strong className="text-texto">esta aba</strong> para gravar.
              </li>
              <li>Deixe esta janela aberta e visível. Para terminar, use Parar no estúdio.</li>
              <li>Esta janela fica muda (evita eco); o som da live vai direto para o arquivo.</li>
            </ol>
            {erro && (
              <p role="alert" className="flex gap-2 text-sm text-ensaio">
                <WarningCircle weight="bold" className="mt-0.5 size-4 shrink-0" aria-hidden />
                {erro}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                aoComecar();
                void comecar();
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-no-ar px-4 font-semibold text-white hover:brightness-110"
            >
              <Record weight="bold" className="size-5" aria-hidden />
              Começar gravação
            </button>
          </>
        )}
      </div>
    </div>
  );
}
