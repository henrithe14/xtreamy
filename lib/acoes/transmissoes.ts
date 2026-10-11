"use server";

import { refresh } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import { accessTokenDoDestino } from "@/lib/destinos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { gerarCodigoConvite, LIMITES, PRIVACIDADES } from "@/lib/transmissoes";
import { apagarLive, criarLive, ErroYouTube } from "@/lib/youtube";
import type { Privacidade } from "@/lib/supabase/tipos";

export type EstadoNovaTransmissao =
  | { tipo: "inicial" }
  | { tipo: "erro"; mensagem: string; campos: { titulo: string; descricao: string } }
  | { tipo: "criada"; id: string };

export async function criarTransmissao(
  _anterior: EstadoNovaTransmissao,
  formData: FormData,
): Promise<EstadoNovaTransmissao> {
  const usuario = await exigirUsuario();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const privacidadeBruta = String(formData.get("privacidade") ?? "nao_listada");
  const campos = { titulo, descricao };

  if (!titulo) return { tipo: "erro", mensagem: "Dê um título à transmissão.", campos };
  if (titulo.length > LIMITES.titulo) {
    return { tipo: "erro", mensagem: `O título pode ter até ${LIMITES.titulo} caracteres.`, campos };
  }
  if (descricao.length > LIMITES.descricao) {
    return { tipo: "erro", mensagem: `A descrição pode ter até ${LIMITES.descricao} caracteres.`, campos };
  }
  const agendadaPara = lerAgendamento(String(formData.get("agendada_para") ?? ""));
  if (agendadaPara === "invalido") {
    return { tipo: "erro", mensagem: "Escolha uma data e hora no futuro, em até 1 ano.", campos };
  }
  const privacidade = PRIVACIDADES.find((p) => p === privacidadeBruta) ?? ("nao_listada" satisfies Privacidade);

  const destinoId = String(formData.get("destino_id") ?? "") || null;

  // Com canal escolhido: cria a live no YouTube primeiro (broadcast + stream + bind).
  let youtube: { broadcastId: string; streamId: string; liveChatId: string | null } | null = null;
  let accessToken: string | null = null;
  if (destinoId) {
    try {
      accessToken = await accessTokenDoDestino(destinoId, usuario.id);
      youtube = await criarLive(accessToken, {
        titulo,
        descricao,
        privacidade,
        // O YouTube exige um início previsto; sem agendamento, "agora".
        inicioPrevisto: agendadaPara ? new Date(agendadaPara) : new Date(Date.now() + 60_000),
      });
    } catch (e) {
      const mensagem = e instanceof ErroYouTube ? e.message : "Não foi possível criar a live no YouTube.";
      return { tipo: "erro", mensagem, campos };
    }
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("transmissoes")
    .insert({
      titulo,
      descricao,
      privacidade,
      agendada_para: agendadaPara,
      codigo_convite: gerarCodigoConvite(),
      destino_id: destinoId,
      youtube_broadcast_id: youtube?.broadcastId ?? null,
      youtube_stream_id: youtube?.streamId ?? null,
      live_chat_id: youtube?.liveChatId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    // Não deixa uma live órfã no canal.
    if (youtube && accessToken) await apagarLive(accessToken, youtube.broadcastId, youtube.streamId);
    return { tipo: "erro", mensagem: "Não foi possível salvar a transmissão. Tente de novo.", campos };
  }

  refresh();
  return { tipo: "criada", id: data.id };
}

/** Vazio = sem agendamento; senão uma data ISO entre agora e 1 ano. */
function lerAgendamento(bruto: string): string | null | "invalido" {
  if (!bruto) return null;
  const data = new Date(bruto);
  const agora = Date.now();
  if (Number.isNaN(data.getTime())) return "invalido";
  if (data.getTime() < agora + 60_000 || data.getTime() > agora + 365 * 24 * 3600_000) return "invalido";
  return data.toISOString();
}

/** Status em que a live nunca foi ao ar: apagar no YouTube não perde vídeo nenhum. */
const NUNCA_FOI_AO_AR = new Set(["rascunho", "ensaio"]);

export async function excluirTransmissao(id: string): Promise<{ erro?: string }> {
  const usuario = await exigirUsuario();
  const supabase = await criarClienteServidor();

  const { data: t } = await supabase
    .from("transmissoes")
    .select("status, destino_id, youtube_broadcast_id, youtube_stream_id")
    .eq("id", id)
    .maybeSingle();
  if (t?.destino_id && t.youtube_broadcast_id && NUNCA_FOI_AO_AR.has(t.status)) {
    try {
      const accessToken = await accessTokenDoDestino(t.destino_id, usuario.id);
      await apagarLive(accessToken, t.youtube_broadcast_id, t.youtube_stream_id);
    } catch {
      // Sem acesso ao canal: apaga só no Xtreamy; a live fica no YouTube Studio.
    }
  }

  const { error } = await supabase.from("transmissoes").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir. Tente de novo." };
  refresh();
  return {};
}
