"use client";

import { useState, useTransition } from "react";
import { ArrowsClockwise, UserPlus } from "@phosphor-icons/react";
import { gerarNovoConvite } from "@/lib/acoes/sala";
import { BotaoCopiarConvite } from "@/components/home/BotaoCopiarConvite";
import { Botao } from "@/components/ui/Botao";
import { BotaoBarra } from "@/components/estudio/BotaoBarra";
import { Dialogo } from "@/components/ui/Dialogo";
import { MensagemErro } from "@/components/ui/Campo";

export function BotaoConvidar({ transmissaoId, urlInicial }: { transmissaoId: string; urlInicial: string }) {
  const [aberto, setAberto] = useState(false);
  const [url, setUrl] = useState(urlInicial);
  const [erro, setErro] = useState<string>();
  const [gerando, iniciar] = useTransition();

  function novoLink() {
    iniciar(async () => {
      const r = await gerarNovoConvite(transmissaoId);
      if (r.url) {
        setUrl(r.url);
        setErro(undefined);
      } else setErro(r.erro);
    });
  }

  return (
    <>
      <BotaoBarra rotulo="Convidar" onClick={() => setAberto(true)}>
        <UserPlus weight="bold" />
      </BotaoBarra>
      <Dialogo aberto={aberto} aoFechar={() => setAberto(false)} titulo="Convidar para o estúdio">
        <p className="mb-3 text-texto-suave">
          Quem abrir este link entra sem conta, depois de testar câmera e microfone.
        </p>
        <p className="mb-4 rounded-md bg-fundo px-3 py-2.5 font-mono text-sm break-all text-texto-suave">{url}</p>
        <div className="flex flex-wrap gap-2">
          <BotaoCopiarConvite url={url} />
          <Botao variante="fantasma" onClick={novoLink} disabled={gerando}>
            <ArrowsClockwise weight="bold" aria-hidden />
            {gerando ? "Gerando…" : "Gerar novo link"}
          </Botao>
        </div>
        <p className="mt-3 text-xs text-texto-suave">
          Gerar um novo link faz o anterior parar de funcionar. Quem já está na sala continua.
        </p>
        <MensagemErro>{erro}</MensagemErro>
      </Dialogo>
    </>
  );
}
