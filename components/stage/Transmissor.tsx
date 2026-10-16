"use client";

import { Broadcast, WarningCircle } from "@phosphor-icons/react";
import { useTransmissor } from "@/hooks/useTransmissor";

/**
 * Painel da janela de transmissão (/stage?transmitir=1). Some enquanto envia: tudo o que
 * aparece nesta aba vai para a live. O estado aparece no estúdio.
 */
export function Transmissor({
  transmissaoId,
  codigo,
  alvo,
  aoComecar,
}: {
  transmissaoId: string;
  codigo?: string;
  alvo: React.RefObject<HTMLElement | null>;
  aoComecar: () => void;
}) {
  const { estado, erro, comecar } = useTransmissor(transmissaoId, codigo, alvo);

  if (estado === "enviando" || estado === "reconectando" || estado === "conectando") return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="vidro-forte flex max-w-md flex-col gap-4 rounded-xl p-6 text-texto">
        {estado === "parado" ? (
          <>
            <h1 className="text-lg font-semibold tracking-tight">Transmissão parada</h1>
            <p className="text-sm text-texto-suave">Pode fechar esta janela.</p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold tracking-tight">Janela de transmissão</h1>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-texto-suave">
              <li>
                Clique em <strong className="text-texto">Começar a transmissão</strong> e escolha{" "}
                <strong className="text-texto">esta aba</strong>.
              </li>
              <li>O estúdio põe a live no ar assim que o YouTube receber o vídeo.</li>
              <li>
                Deixe esta janela <strong className="text-texto">aberta</strong> até o fim (pode ficar atrás de outras, mas não
                minimizada). Fechar derruba a live.
              </li>
              <li>Esta janela fica muda (evita eco); o som da live vai direto para o YouTube.</li>
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
              <Broadcast weight="bold" className="size-5" aria-hidden />
              Começar a transmissão
            </button>
          </>
        )}
      </div>
    </div>
  );
}
