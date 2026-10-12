"use client";

import { useState } from "react";
import { SpeakerHigh } from "@phosphor-icons/react";
import { tocarSomTeste } from "@/lib/som";
import { Botao } from "@/components/ui/Botao";

export function TestarSom({ altoFalanteId }: { altoFalanteId: string }) {
  const [estado, setEstado] = useState<"parado" | "tocando" | "falhou">("parado");

  async function testar() {
    setEstado("tocando");
    try {
      await tocarSomTeste(altoFalanteId);
      window.setTimeout(() => setEstado("parado"), 700);
    } catch {
      setEstado("falhou");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Botao variante="secundario" onClick={testar} disabled={estado === "tocando"} className="w-full sm:w-auto">
        <SpeakerHigh weight="bold" aria-hidden />
        Testar som
      </Botao>
      {estado === "falhou" && (
        <p role="alert" className="text-xs text-no-ar">
          Não foi possível tocar neste alto-falante. Escolha outro.
        </p>
      )}
    </div>
  );
}
