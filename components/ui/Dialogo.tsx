"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
};

/** Diálogo modal nativo (<dialog>): foco preso, Esc fecha, fundo escurecido. */
export function Dialogo({ aberto, aoFechar, titulo, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      aria-labelledby="dialogo-titulo"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border border-borda bg-superficie p-0 text-texto backdrop:bg-black/60"
    >
      <div className="flex items-center justify-between border-b border-borda px-5 py-4">
        <h2 id="dialogo-titulo" className="text-lg font-semibold">
          {titulo}
        </h2>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="rounded-md p-1.5 text-texto-suave hover:bg-superficie-2 hover:text-texto"
        >
          <X weight="bold" className="size-5" />
        </button>
      </div>
      <div className="px-5 py-5">{children}</div>
    </dialog>
  );
}
