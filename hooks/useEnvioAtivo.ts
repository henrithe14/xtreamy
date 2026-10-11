"use client";

import { useCallback, useState } from "react";
import { registrarAtivo } from "@/lib/acoes/ativos";
import { ACEITOS, BUCKET_ATIVOS, LIMITE_ARQUIVO, type CategoriaMidia, type TipoAtivo } from "@/lib/ativos";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

/** Duração (s) de um vídeo/áudio local, lida dos metadados do arquivo. */
function lerDuracao(arquivo: File): Promise<number | undefined> {
  if (!arquivo.type.startsWith("video/") && !arquivo.type.startsWith("audio/")) return Promise.resolve(undefined);
  return new Promise((resolver) => {
    const url = URL.createObjectURL(arquivo);
    const el = document.createElement(arquivo.type.startsWith("video/") ? "video" : "audio");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolver(Number.isFinite(el.duration) ? el.duration : undefined);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolver(undefined);
    };
    el.src = url;
  });
}

/**
 * Envia um arquivo direto do navegador ao Storage (pasta do próprio usuário; as
 * políticas do bucket garantem isso) e registra o ativo no servidor.
 */
export function useEnvioAtivo(aoEnviar: () => void) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string>();

  const enviar = useCallback(
    async (arquivo: File, tipo: TipoAtivo, categoria?: CategoriaMidia) => {
      setErro(undefined);
      if (!ACEITOS[tipo].includes(arquivo.type)) {
        setErro("Tipo de arquivo não aceito aqui.");
        return;
      }
      if (arquivo.size > LIMITE_ARQUIVO) {
        setErro("Arquivo grande demais: até 50 MB. Para vídeo, prefira 1080p ou menos.");
        return;
      }
      setEnviando(true);
      try {
        const supabase = criarClienteNavegador();
        const { data: sessao } = await supabase.auth.getUser();
        if (!sessao.user) throw new Error("Sessão expirada. Entre de novo.");
        const ext = arquivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
        const caminho = `${sessao.user.id}/${tipo}/${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage
          .from(BUCKET_ATIVOS)
          .upload(caminho, arquivo, { contentType: arquivo.type, cacheControl: "31536000", upsert: false });
        if (error) throw new Error("O envio falhou. Confira se o SQL da Etapa 10 foi rodado e tente de novo.");

        const r = await registrarAtivo({
          tipo,
          nome: arquivo.name.replace(/\.[^.]+$/, ""),
          caminho,
          mime: arquivo.type,
          tamanho: arquivo.size,
          categoria,
          duracao: await lerDuracao(arquivo),
        });
        if (r.erro) throw new Error(r.erro);
        aoEnviar();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "O envio falhou.");
      } finally {
        setEnviando(false);
      }
    },
    [aoEnviar],
  );

  return { enviar, enviando, erro };
}
