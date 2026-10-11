"use client";

import { useState, useTransition } from "react";
import { Trash } from "@phosphor-icons/react";
import { excluirTransmissao } from "@/lib/acoes/transmissoes";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";
import { MensagemErro } from "@/components/ui/Campo";

export function BotaoExcluir({ id, titulo }: { id: string; titulo: string }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string>();
  const [excluindo, iniciar] = useTransition();

  function abrir() {
    setErro(undefined);
    setAberto(true);
  }

  function confirmar() {
    iniciar(async () => {
      const resultado = await excluirTransmissao(id);
      if (resultado.erro) setErro(resultado.erro);
      else setAberto(false);
    });
  }

  return (
    <>
      <Botao variante="fantasma" onClick={abrir} aria-label={`Excluir ${titulo}`} className="px-3">
        <Trash weight="fill" aria-hidden />
      </Botao>
      <Dialogo aberto={aberto} aoFechar={() => setAberto(false)} titulo="Excluir transmissão?">
        <p className="mb-2">
          <strong className="font-semibold">{titulo}</strong> será excluída e o link de convite
          deixa de funcionar.
        </p>
        <p className="mb-4 text-sm text-texto-suave">Isso não pode ser desfeito.</p>
        <MensagemErro>{erro}</MensagemErro>
        <div className="mt-2 flex justify-end gap-2">
          <Botao variante="secundario" onClick={() => setAberto(false)}>
            Cancelar
          </Botao>
          <Botao variante="no-ar" onClick={confirmar} disabled={excluindo}>
            {excluindo ? "Excluindo…" : "Excluir"}
          </Botao>
        </div>
      </Dialogo>
    </>
  );
}
