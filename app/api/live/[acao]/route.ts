import { obterDirecao } from "@/lib/direcao";
import { accessTokenDoDestino } from "@/lib/destinos";
import { alterarCenaNoServidor, iniciarEgress, pararEgress } from "@/lib/livekit";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { StatusTransmissao } from "@/lib/transmissao";
import type { Transmissao } from "@/lib/transmissoes";
import { enderecoRtmp, ErroYouTube, statusStream, transicionar } from "@/lib/youtube";
import { ehVideo, urlPublica } from "@/lib/ativos";
import type { Midia } from "@/lib/cena";

// Iniciar espera o YouTube receber o sinal (até ~1 minuto).
export const maxDuration = 120;

const ACOES = ["iniciar", "intervalo", "retomar", "encerrar"] as const;
type Acao = (typeof ACOES)[number];

class ErroLive extends Error {}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Iniciar / Intervalo / Retomar / Encerrar a live. Só o diretor (dono logado). */
export async function POST(request: Request, ctx: RouteContext<"/api/live/[acao]">) {
  const { acao: bruta } = await ctx.params;
  const acao = ACOES.find((a) => a === bruta);
  if (!acao) return Response.json({ erro: "Ação desconhecida." }, { status: 404 });

  let transmissaoId = "";
  let codigo: string | undefined;
  try {
    const corpo = (await request.json()) as { transmissaoId?: unknown; codigo?: unknown };
    transmissaoId = typeof corpo.transmissaoId === "string" ? corpo.transmissaoId : "";
    codigo = typeof corpo.codigo === "string" && corpo.codigo ? corpo.codigo : undefined;
  } catch {}

  // Dono ou diretor delegado; o YouTube e a biblioteca são sempre os do dono.
  const direcao = await obterDirecao(transmissaoId, codigo);
  if (!direcao) return Response.json({ erro: "Apenas o diretor controla a live." }, { status: 403 });
  const t = direcao.transmissao;

  try {
    await executar(acao, t, direcao.donoId);
    return Response.json({ ok: true });
  } catch (e) {
    const mensagem =
      e instanceof ErroLive || e instanceof ErroYouTube ? e.message : "Algo falhou ao falar com o YouTube ou o LiveKit.";
    console.error(`[live/${acao}]`, e instanceof Error ? e.message : e);
    return Response.json({ erro: mensagem }, { status: 409 });
  }
}

async function salvarStatus(id: string, status: StatusTransmissao, extra: Partial<Transmissao> = {}) {
  // Admin: o diretor delegado não tem sessão (a permissão já foi conferida acima).
  const supabase = criarClienteAdmin();
  await supabase.from("transmissoes").update({ status, ...extra }).eq("id", id);
}

/** Mídia "Volto logo" mais recente do diretor, em loop, para o intervalo (ou null). */
async function midiaVoltoLogo(donoId: string): Promise<Midia | null> {
  const supabase = criarClienteAdmin();
  const { data } = await supabase
    .from("ativos")
    .select("caminho, mime")
    .eq("user_id", donoId)
    .eq("tipo", "midia")
    .eq("metadados->>categoria", "volto-logo")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { url: urlPublica(data.caminho), video: ehVideo(data.mime), loop: true, inicioEm: Date.now() };
}

async function executar(acao: Acao, t: Transmissao, userId: string) {
  const noAr = t.status === "ao_vivo" || t.status === "intervalo";

  if (acao === "intervalo") {
    if (t.status !== "ao_vivo") throw new ErroLive("A live não está no ar.");
    // Com mídia "Volto logo" enviada, ela toca em tela cheia; sem, a tela simples da marca.
    const midia = await midiaVoltoLogo(userId).catch(() => null);
    await alterarCenaNoServidor(t.id, (c) => ({ status: "intervalo", midia: midia ?? c.midia }));
    await salvarStatus(t.id, "intervalo");
    return;
  }

  if (acao === "retomar") {
    if (t.status !== "intervalo") throw new ErroLive("A live não está em intervalo.");
    await alterarCenaNoServidor(t.id, () => ({ status: "ao_vivo", midia: null }));
    await salvarStatus(t.id, "ao_vivo");
    return;
  }

  if (acao === "encerrar") {
    if (!noAr && !t.egress_id) throw new ErroLive("A live não está no ar.");
    if (t.egress_id) await pararEgress(t.egress_id).catch(() => undefined);
    if (t.destino_id && t.youtube_broadcast_id) {
      const token = await accessTokenDoDestino(t.destino_id, userId);
      await transicionar(token, t.youtube_broadcast_id, "complete").catch((e: unknown) => {
        // Já encerrada no YouTube não é erro.
        if (!(e instanceof ErroYouTube && e.motivo === "redundantTransition")) throw e;
      });
    }
    await alterarCenaNoServidor(t.id, () => ({ status: "encerrada", noArDesde: null }));
    await salvarStatus(t.id, "encerrada", { egress_id: null });
    return;
  }

  // ---- iniciar ----
  if (noAr) throw new ErroLive("A live já está no ar.");
  if (t.status === "encerrada") throw new ErroLive("Esta transmissão já foi encerrada. Crie uma nova.");
  if (!t.destino_id || !t.youtube_broadcast_id || !t.youtube_stream_id) {
    throw new ErroLive("Esta transmissão não tem canal do YouTube. Crie uma nova escolhendo o canal.");
  }

  const token = await accessTokenDoDestino(t.destino_id, userId);
  const rtmp = await enderecoRtmp(token, t.youtube_stream_id);
  const egressId = await iniciarEgress(t.id, rtmp);
  await salvarStatus(t.id, "ensaio", { egress_id: egressId });

  try {
    // Espera o YouTube receber o vídeo antes de pôr a live no ar.
    let ativo = false;
    for (let i = 0; i < 25 && !ativo; i++) {
      await esperar(3000);
      ativo = (await statusStream(token, t.youtube_stream_id)) === "active";
    }
    if (!ativo) throw new ErroLive("O YouTube não recebeu o vídeo a tempo. Tente iniciar de novo.");

    await transicionar(token, t.youtube_broadcast_id, "live").catch((e: unknown) => {
      if (!(e instanceof ErroYouTube && e.motivo === "redundantTransition")) throw e;
    });
  } catch (e) {
    // Não deixa o Egress rodando (e cobrando) se a live não entrou no ar.
    await pararEgress(egressId).catch(() => undefined);
    await salvarStatus(t.id, "ensaio", { egress_id: null });
    throw e;
  }

  await alterarCenaNoServidor(t.id, () => ({ status: "ao_vivo", noArDesde: Date.now() }));
  await salvarStatus(t.id, "ao_vivo");
}
