import { exigirUsuario } from "@/lib/auth";
import { resolverAcesso } from "@/lib/acesso";
import { accessTokenDoDestino } from "@/lib/destinos";
import { alterarCenaNoServidor, iniciarEgress, pararEgress } from "@/lib/livekit";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { StatusTransmissao } from "@/lib/transmissao";
import { obterTransmissaoDoUsuario, type Transmissao } from "@/lib/transmissoes";
import { enderecoRtmp, ErroYouTube, statusStream, transicionar } from "@/lib/youtube";

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
  try {
    const corpo = (await request.json()) as { transmissaoId?: unknown };
    transmissaoId = typeof corpo.transmissaoId === "string" ? corpo.transmissaoId : "";
  } catch {}

  const acesso = await resolverAcesso(transmissaoId, undefined);
  if (acesso?.papel !== "host") return Response.json({ erro: "Apenas o diretor controla a live." }, { status: 403 });
  const usuario = await exigirUsuario();
  const t = await obterTransmissaoDoUsuario(transmissaoId);
  if (!t) return Response.json({ erro: "Transmissão não encontrada." }, { status: 404 });

  try {
    await executar(acao, t, usuario.id);
    return Response.json({ ok: true });
  } catch (e) {
    const mensagem =
      e instanceof ErroLive || e instanceof ErroYouTube ? e.message : "Algo falhou ao falar com o YouTube ou o LiveKit.";
    console.error(`[live/${acao}]`, e instanceof Error ? e.message : e);
    return Response.json({ erro: mensagem }, { status: 409 });
  }
}

async function salvarStatus(id: string, status: StatusTransmissao, extra: Partial<Transmissao> = {}) {
  const supabase = await criarClienteServidor();
  await supabase.from("transmissoes").update({ status, ...extra }).eq("id", id);
}

async function executar(acao: Acao, t: Transmissao, userId: string) {
  const noAr = t.status === "ao_vivo" || t.status === "intervalo";

  if (acao === "intervalo") {
    if (t.status !== "ao_vivo") throw new ErroLive("A live não está no ar.");
    await alterarCenaNoServidor(t.id, () => ({ status: "intervalo" }));
    await salvarStatus(t.id, "intervalo");
    return;
  }

  if (acao === "retomar") {
    if (t.status !== "intervalo") throw new ErroLive("A live não está em intervalo.");
    await alterarCenaNoServidor(t.id, () => ({ status: "ao_vivo" }));
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
