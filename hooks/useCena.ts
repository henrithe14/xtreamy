"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRoomInfo } from "@livekit/components-react";
import { lerCena, type Cena } from "@/lib/cena";

/** Cena atual, lida dos metadata da sala (atualiza sozinha para todos). */
export function useCena(): Cena {
  const { metadata } = useRoomInfo();
  return useMemo(() => lerCena(metadata), [metadata]);
}

/**
 * Para o diretor: cena com alteração otimista (a tela responde na hora) e envio ao
 * servidor em fila, um pedido por vez, para cliques rápidos não se atropelarem.
 */
/** `codigo`: diretor delegado (convidado); o servidor confere a direção. */
export function useControleCena(transmissaoId: string, codigo?: string) {
  const cenaSala = useCena();
  const [otimista, setOtimista] = useState<Cena | null>(null);
  const [erro, setErro] = useState<string>();
  const fila = useRef<Promise<void>>(Promise.resolve());

  // Quando a sala já mostra a versão enviada (ou mais nova), a cópia otimista sai.
  const cena = otimista && otimista.versao > cenaSala.versao ? otimista : cenaSala;
  const ultima = useRef(cena);
  useEffect(() => {
    ultima.current = cena;
  }, [cena]);

  const alterar = useCallback(
    (mudanca: (atual: Cena) => Omit<Cena, "versao">) => {
      const base = ultima.current;
      const nova: Cena = { ...mudanca(base), versao: base.versao + 1 };
      ultima.current = nova;
      setOtimista(nova);
      setErro(undefined);

      fila.current = fila.current.then(async () => {
        try {
          const resposta = await fetch("/api/cena", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transmissaoId, codigo, cena: nova }),
          });
          if (!resposta.ok) {
            const dados = (await resposta.json().catch(() => ({}))) as { erro?: string };
            throw new Error(dados.erro ?? "Não foi possível mudar a cena.");
          }
        } catch (e) {
          // Volta para o que a sala realmente mostra.
          setOtimista(null);
          setErro(e instanceof Error ? e.message : "Não foi possível mudar a cena.");
        }
      });
    },
    [transmissaoId, codigo],
  );

  return { cena, alterar, erro };
}
