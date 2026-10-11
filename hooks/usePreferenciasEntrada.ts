"use client";

import { useCallback, useEffect, useState } from "react";
import {
  carregarPreferencias,
  PREFERENCIAS_PADRAO,
  salvarPreferencias,
  type Preferencias,
} from "@/lib/preferencias";

/**
 * Preferências da pré-entrada, salvas no navegador. `carregado` só fica true depois
 * de ler o localStorage (no cliente), para não criar faixas com aparelhos errados.
 */
export function usePreferenciasEntrada() {
  const [preferencias, setPreferencias] = useState<Preferencias>(PREFERENCIAS_PADRAO);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    // Leitura do localStorage só existe no cliente; feita uma vez após montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreferencias(carregarPreferencias());
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (carregado) salvarPreferencias(preferencias);
  }, [preferencias, carregado]);

  const atualizar = useCallback(<K extends keyof Preferencias>(chave: K, valor: Preferencias[K]) => {
    setPreferencias((atual) => (atual[chave] === valor ? atual : { ...atual, [chave]: valor }));
  }, []);

  return { preferencias, atualizar, carregado };
}
