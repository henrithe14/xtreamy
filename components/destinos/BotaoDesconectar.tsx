"use client";

import { useState, useTransition } from "react";
import { removerDestino } from "@/lib/acoes/destinos";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";
import { MensagemErro } from "@/components/ui/Campo";

export function BotaoDesconectar({ id, nome }: { id: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string>();
  const [desconectando, iniciar] = useTransition();

  return (
    <>
      <Botao variante="fantasma" onClick={() => setAberto(true)}>
        Desconectar
      </Botao>
      <Dialogo aberto={aberto} aoFechar={() => setAberto(false)} titulo="Desconectar canal?">
        <p className="mb-2">
          O Xtreamy deixa de acessar <strong className="font-semibold">{nome}</strong>.
        </p>
        <p className="mb-4 text-sm text-texto-suave">
          As lives já criadas continuam no YouTube. Para transmitir de novo neste canal, conecte outra vez.
        </p>
        <MensagemErro>{erro}</MensagemErro>
        <div className="mt-2 flex justify-end gap-2">
          <Botao variante="secundario" onClick={() => setAberto(false)}>
            Cancelar
          </Botao>
          <Botao
            variante="no-ar"
            disabled={desconectando}
            onClick={() =>
              iniciar(async () => {
                const r = await removerDestino(id);
                if (r.erro) setErro(r.erro);
                else setAberto(false);
              })
            }
          >
            {desconectando ? "Desconectando…" : "Desconectar"}
          </Botao>
        </div>
      </Dialogo>
    </>
  );
}
