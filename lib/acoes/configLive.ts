"use server";

import { refresh } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import { accessTokenDoDestino } from "@/lib/destinos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { LIMITES, PRIVACIDADES } from "@/lib/transmissoes";
import { IDIOMAS, LIMITE_CAPA, LIMITE_TAGS, lerAgendamento, lerTags, TIPOS_CAPA } from "@/lib/validacao";
import { atualizarLive, definirCapa, ErroYouTube, listarCategorias, type Categoria } from "@/lib/youtube";

async function transmissaoComCanal(id: string) {
  const usuario = await exigirUsuario();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("transmissoes").select("*").eq("id", id).maybeSingle();
  if (!data?.destino_id || !data.youtube_broadcast_id) return null;
  return { usuario, transmissao: data, destinoId: data.destino_id, broadcastId: data.youtube_broadcast_id };
}

export async function carregarCategorias(transmissaoId: string): Promise<{ categorias?: Categoria[]; erro?: string }> {
  const t = await transmissaoComCanal(transmissaoId);
  if (!t) return { erro: "Esta transmissão não tem live no YouTube." };
  try {
    return { categorias: await listarCategorias(await accessTokenDoDestino(t.destinoId, t.usuario.id)) };
  } catch (e) {
    return { erro: e instanceof ErroYouTube ? e.message : "Não foi possível carregar as categorias." };
  }
}

export type EstadoConfigLive = { tipo: "inicial" } | { tipo: "erro"; mensagem: string } | { tipo: "salvo"; aviso?: string };

export async function salvarConfigLive(
  transmissaoId: string,
  _anterior: EstadoConfigLive,
  formData: FormData,
): Promise<EstadoConfigLive> {
  const t = await transmissaoComCanal(transmissaoId);
  if (!t) return { tipo: "erro", mensagem: "Esta transmissão não tem live no YouTube." };

  const texto = (nome: string) => String(formData.get(nome) ?? "").trim();
  const titulo = texto("titulo");
  const descricao = texto("descricao");
  if (!titulo || titulo.length > LIMITES.titulo) return { tipo: "erro", mensagem: "O título precisa ter de 1 a 100 caracteres." };
  if (descricao.length > LIMITES.descricao) return { tipo: "erro", mensagem: "A descrição pode ter até 5000 caracteres." };

  const privacidade = PRIVACIDADES.find((p) => p === texto("privacidade"));
  if (!privacidade) return { tipo: "erro", mensagem: "Escolha a privacidade." };

  // Mesmo horário que já estava salvo é aceito (pode já ter passado); horário novo precisa ser futuro.
  const agendadaBruta = texto("agendada_para");
  const agendadaPara =
    agendadaBruta && t.transmissao.agendada_para && new Date(agendadaBruta).getTime() === new Date(t.transmissao.agendada_para).getTime()
      ? t.transmissao.agendada_para
      : lerAgendamento(agendadaBruta);
  if (agendadaPara === "invalido") return { tipo: "erro", mensagem: "Escolha uma data e hora no futuro, em até 1 ano." };

  const tags = lerTags(texto("tags"));
  if (tags === "longas") return { tipo: "erro", mensagem: `As tags passam de ${LIMITE_TAGS} caracteres no total.` };

  const idioma = IDIOMAS.find((i) => i.codigo === texto("idioma"))?.codigo ?? "pt-BR";
  const categoriaId = /^\d{1,3}$/.test(texto("categoria_id")) ? texto("categoria_id") : null;

  const capa = formData.get("capa");
  const temCapa = capa instanceof File && capa.size > 0;
  if (temCapa && !(TIPOS_CAPA as readonly string[]).includes(capa.type)) {
    return { tipo: "erro", mensagem: "A capa precisa ser JPG ou PNG." };
  }
  if (temCapa && capa.size > LIMITE_CAPA) return { tipo: "erro", mensagem: "A capa pode ter até 2 MB." };

  let accessToken: string;
  try {
    accessToken = await accessTokenDoDestino(t.destinoId, t.usuario.id);
    await atualizarLive(accessToken, t.broadcastId, {
      titulo,
      descricao,
      privacidade,
      inicioPrevisto: agendadaPara ? new Date(agendadaPara) : new Date(Date.now() + 60_000),
      categoriaId,
      tags,
      idioma,
    });
  } catch (e) {
    return { tipo: "erro", mensagem: e instanceof ErroYouTube ? e.message : "O YouTube não aceitou as mudanças." };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("transmissoes")
    .update({ titulo, descricao, privacidade, agendada_para: agendadaPara, categoria_id: categoriaId, tags, idioma })
    .eq("id", transmissaoId);
  if (error) return { tipo: "erro", mensagem: "Salvo no YouTube, mas não no Xtreamy. Tente de novo." };

  // A capa vai por último: se falhar, o resto já está salvo e o aviso explica.
  let aviso: string | undefined;
  if (temCapa) {
    try {
      await definirCapa(accessToken, t.broadcastId, capa);
    } catch (e) {
      aviso = e instanceof ErroYouTube ? e.message : "A capa não foi enviada. Tente de novo.";
    }
  }

  refresh();
  return { tipo: "salvo", aviso };
}
