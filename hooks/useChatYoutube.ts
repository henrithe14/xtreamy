"use client";

import { useEffect, useState } from "react";
import type { MensagemChat } from "@/lib/youtube";

const MAX_MENSAGENS = 300;

type Estado = { mensagens: MensagemChat[]; erro?: string; encerrado: boolean; carregando: boolean };

/**
 * Lê o chat do YouTube pelo servidor, respeitando o intervalo que o YouTube pede
 * (cota diária). Só roda enquanto `ativo` (aba aberta / live acontecendo).
 */
export function useChatYoutube(transmissaoId: string, ativo: boolean, codigo?: string) {
  const [estado, setEstado] = useState<Estado>({ mensagens: [], encerrado: false, carregando: true });

  useEffect(() => {
    if (!ativo) return;
    let cancelado = false;
    let espera: number | undefined;
    let pagina: string | null = null;

    async function ler() {
      try {
        const url = `/api/youtube/chat?t=${encodeURIComponent(transmissaoId)}${codigo ? `&c=${encodeURIComponent(codigo)}` : ""}${pagina ? `&pagina=${encodeURIComponent(pagina)}` : ""}`;
        const r = await fetch(url, { cache: "no-store" });
        const dados = (await r.json()) as {
          mensagens?: MensagemChat[];
          proximaPagina?: string | null;
          intervaloMs?: number;
          encerrado?: boolean;
          erro?: string;
        };
        if (cancelado) return;
        if (dados.proximaPagina) pagina = dados.proximaPagina;
        setEstado((atual) => {
          const novas = dados.mensagens ?? [];
          const vistas = new Set(atual.mensagens.map((m) => m.id));
          const juntas = [...atual.mensagens, ...novas.filter((m) => !vistas.has(m.id))].slice(-MAX_MENSAGENS);
          return { mensagens: juntas, erro: dados.erro, encerrado: Boolean(dados.encerrado), carregando: false };
        });
        if (dados.encerrado) return;
        espera = window.setTimeout(ler, Math.max(dados.intervaloMs ?? 10000, 2000));
      } catch {
        if (cancelado) return;
        setEstado((atual) => ({ ...atual, erro: "Sem conexão com o servidor.", carregando: false }));
        espera = window.setTimeout(ler, 15000);
      }
    }

    void ler();
    return () => {
      cancelado = true;
      window.clearTimeout(espera);
    };
  }, [transmissaoId, ativo, codigo]);

  return estado;
}
