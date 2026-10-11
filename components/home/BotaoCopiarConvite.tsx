"use client";

import { useEffect, useState } from "react";
import { Check, LinkSimple } from "@phosphor-icons/react";
import { Botao } from "@/components/ui/Botao";

const TEXTOS = { parado: "Copiar convite", copiado: "Convite copiado", falhou: "Não deu para copiar" } as const;

export function BotaoCopiarConvite({ url }: { url: string }) {
  const [estado, setEstado] = useState<keyof typeof TEXTOS>("parado");

  useEffect(() => {
    if (estado === "parado") return;
    const t = setTimeout(() => setEstado("parado"), 2500);
    return () => clearTimeout(t);
  }, [estado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setEstado("copiado");
    } catch {
      setEstado("falhou");
    }
  }

  return (
    <Botao variante="secundario" onClick={copiar}>
      {estado === "copiado" ? <Check weight="bold" aria-hidden /> : <LinkSimple weight="bold" aria-hidden />}
      <span aria-live="polite">{TEXTOS[estado]}</span>
    </Botao>
  );
}
