// Estado da cena: fonte única da verdade do que vai ao ar (CLAUDE.md, seção 7).
// Fica nos metadata da sala do LiveKit; só o servidor grava (a pedido do diretor).
// Campos de artes, mídias, widgets etc. entram nas etapas correspondentes.

import { LAYOUTS, LAYOUT_PADRAO, TAMANHO_SOLO } from "@/lib/layouts";
import { ehPosicaoCameras, POSICAO_PADRAO, type PosicaoCameras } from "@/lib/apresentacao";
import { ESTILO_PADRAO, validarBanner, validarEstilo, type Banner, type Estilo } from "@/lib/estilo";
import { urlDeAtivo } from "@/lib/ativos";

export type StatusCena = "ensaio" | "ao_vivo" | "intervalo" | "encerrada";

/** Cores da marca: geram o fundo padrão (degradê) e, na Etapa 9, etiquetas e banners. */
export type CoresMarca = { primaria: string; secundaria: string };

export const CORES_PADRAO: CoresMarca = { primaria: "#3b82f6", secundaria: "#10b981" };

/** Comentário mostrado na tela (do chat do YouTube ou do chat interno). */
export type ComentarioDestacado = {
  autor: string;
  /** Foto do autor (só endereços do YouTube/Google). */
  avatar: string | null;
  texto: string;
  origem: "youtube" | "interno";
};

export const LIMITES_COMENTARIO = { autor: 80, texto: 300 } as const;

export type PosicaoLogo = "se" | "sd" | "ie" | "id";
export type Logo = { url: string; posicao: PosicaoLogo };
export type Fundo = { tipo: "cor"; valor: string } | { tipo: "imagem" | "video"; valor: string };
/** Mídia em tela cheia. inicioEm (ms) sincroniza o vídeo entre a prévia e a live. */
export type Midia = { url: string; video: boolean; loop: boolean; inicioEm: number };
export type Vinheta = { url: string; inicioEm: number };

/** Faixa da música de fundo. A duração (s) vem do envio e permite saber onde a playlist está. */
export type FaixaMusica = { url: string; duracao: number };
/** Quanto a música baixa quando alguém fala na live. */
export type NivelDucking = "desligado" | "leve" | "forte";
export const NIVEIS_DUCKING: NivelDucking[] = ["desligado", "leve", "forte"];
/** Fração do volume que sobra enquanto alguém fala. */
export const FATOR_DUCKING: Record<NivelDucking, number> = { desligado: 1, leve: 0.4, forte: 0.15 };
export const MAX_FAIXAS = 30;

/**
 * Música de fundo (Etapa 11): playlist em loop. inicioEm é quando a primeira faixa teria
 * começado; assim o /stage sabe a faixa e o ponto certos, mesmo se recarregar.
 */
export type Musica = {
  faixas: FaixaMusica[];
  inicioEm: number;
  /** Pausada: posição (ms desde inicioEm) congelada. null = tocando. */
  pausadaEm: number | null;
  /** 0–1 */
  volume: number;
  ducking: NivelDucking;
};

/** Faixa e segundo em que a playlist está agora. */
export function posicaoMusica(m: Musica, agora: number): { indice: number; offsetSeg: number } {
  const total = m.faixas.reduce((s, f) => s + f.duracao, 0);
  const decorrido = (m.pausadaEm ?? agora - m.inicioEm) / 1000;
  let t = ((decorrido % total) + total) % total;
  for (let i = 0; i < m.faixas.length; i++) {
    if (t < m.faixas[i].duracao) return { indice: i, offsetSeg: t };
    t -= m.faixas[i].duracao;
  }
  return { indice: 0, offsetSeg: 0 };
}

/** Põe a playlist numa faixa e segundo, mantendo pausada se estava pausada. */
export function posicionarMusica(
  m: Omit<Musica, "faixas" | "inicioEm">,
  faixas: FaixaMusica[],
  indice: number,
  offsetSeg: number,
  agora: number,
): Musica {
  const decorrido = (faixas.slice(0, indice).reduce((s, f) => s + f.duracao, 0) + offsetSeg) * 1000;
  return { ...m, faixas, inicioEm: agora - decorrido, pausadaEm: m.pausadaEm === null ? null : decorrido };
}

export type Cena = {
  /** Cresce a cada alteração; serve para descartar respostas antigas. */
  versao: number;
  layoutId: string;
  /** Layout Solo: tamanho da câmera em % do quadro (40–100). */
  tamanhoSolo: number;
  /** Identities, na ordem dos slots. */
  noPalco: string[];
  /** Quem tem a tela compartilhada no ar (aparece em layouts de apresentação). */
  apresentacaoId: string | null;
  /** Layout Apresentação: onde ficam as câmeras em volta da tela. */
  posicaoCameras: PosicaoCameras;
  status: StatusCena;
  /** Quando a live entrou no ar (ms desde 1970). Só o servidor define. */
  noArDesde: number | null;
  /** Quando a live foi encerrada (ms). A tela "Transmissão encerrada" aparece só um tempo. Só o servidor define. */
  encerradaEm: number | null;
  cores: CoresMarca;
  comentarioDestacado: ComentarioDestacado | null;
  estilo: Estilo;
  /** Identities cuja etiqueta (nome) não aparece na live. */
  etiquetasOcultas: string[];
  /** No palco com a câmera escondida: a voz vai para a live, a imagem não (não ocupa lugar no layout). */
  camerasOcultas: string[];
  banner: Banner | null;
  logo: Logo | null;
  overlay: string | null;
  /** null = degradê das cores da marca. */
  fundo: Fundo | null;
  midia: Midia | null;
  vinheta: Vinheta | null;
  musica: Musica | null;
};

export const CENA_INICIAL: Cena = {
  versao: 0,
  layoutId: LAYOUT_PADRAO,
  tamanhoSolo: TAMANHO_SOLO.padrao,
  posicaoCameras: POSICAO_PADRAO,
  noPalco: [],
  apresentacaoId: null,
  status: "ensaio",
  noArDesde: null,
  encerradaEm: null,
  cores: CORES_PADRAO,
  comentarioDestacado: null,
  estilo: ESTILO_PADRAO,
  etiquetasOcultas: [],
  camerasOcultas: [],
  banner: null,
  logo: null,
  overlay: null,
  fundo: null,
  midia: null,
  vinheta: null,
  musica: null,
};

const HEX = /^#[0-9a-f]{6}$/i;

function validarCores(dado: unknown): CoresMarca | null {
  if (dado === undefined) return CORES_PADRAO; // cenas antigas, sem cores
  if (!dado || typeof dado !== "object") return null;
  const c = dado as Partial<CoresMarca>;
  if (typeof c.primaria !== "string" || !HEX.test(c.primaria)) return null;
  if (typeof c.secundaria !== "string" || !HEX.test(c.secundaria)) return null;
  return { primaria: c.primaria.toLowerCase(), secundaria: c.secundaria.toLowerCase() };
}

/** Avatar só de domínios do YouTube/Google: a live nunca carrega imagem de terceiros. */
const AVATAR_PERMITIDO = /^https:\/\/(yt\d?\.ggpht\.com|[a-z0-9-]+\.googleusercontent\.com)\//;

function validarComentario(dado: unknown): ComentarioDestacado | null | "invalido" {
  if (dado === undefined || dado === null) return null;
  if (typeof dado !== "object") return "invalido";
  const c = dado as Partial<ComentarioDestacado>;
  if (typeof c.autor !== "string" || !c.autor.trim() || c.autor.length > LIMITES_COMENTARIO.autor) return "invalido";
  if (typeof c.texto !== "string" || !c.texto.trim() || c.texto.length > LIMITES_COMENTARIO.texto) return "invalido";
  if (c.origem !== "youtube" && c.origem !== "interno") return "invalido";
  const avatar = typeof c.avatar === "string" && c.avatar.length <= 500 && AVATAR_PERMITIDO.test(c.avatar) ? c.avatar : null;
  return { autor: c.autor.trim(), texto: c.texto.trim(), origem: c.origem, avatar };
}

const POSICOES: PosicaoLogo[] = ["se", "sd", "ie", "id"];
const tempo = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

/** Campos de ativos: null quando ausentes; "invalido" quando presentes e errados. */
function validarAtivos(c: Record<string, unknown>) {
  const invalido = "invalido" as const;

  let logo: Logo | null = null;
  if (c.logo != null) {
    const l = c.logo as Partial<Logo>;
    const url = urlDeAtivo(l.url);
    if (!url || !POSICOES.includes(l.posicao as PosicaoLogo)) return invalido;
    logo = { url, posicao: l.posicao as PosicaoLogo };
  }

  let overlay: string | null = null;
  if (c.overlay != null) {
    overlay = urlDeAtivo(c.overlay);
    if (!overlay) return invalido;
  }

  let fundo: Fundo | null = null;
  if (c.fundo != null) {
    const f = c.fundo as { tipo?: unknown; valor?: unknown };
    if (f.tipo === "cor" && typeof f.valor === "string" && HEX.test(f.valor)) fundo = { tipo: "cor", valor: f.valor };
    else if ((f.tipo === "imagem" || f.tipo === "video") && urlDeAtivo(f.valor)) fundo = { tipo: f.tipo, valor: f.valor as string };
    else return invalido;
  }

  let midia: Midia | null = null;
  if (c.midia != null) {
    const m = c.midia as Partial<Midia>;
    const url = urlDeAtivo(m.url);
    const inicioEm = tempo(m.inicioEm);
    if (!url || inicioEm === null || typeof m.video !== "boolean" || typeof m.loop !== "boolean") return invalido;
    midia = { url, video: m.video, loop: m.loop, inicioEm };
  }

  let vinheta: Vinheta | null = null;
  if (c.vinheta != null) {
    const v = c.vinheta as Partial<Vinheta>;
    const url = urlDeAtivo(v.url);
    const inicioEm = tempo(v.inicioEm);
    if (!url || inicioEm === null) return invalido;
    vinheta = { url, inicioEm };
  }

  let musica: Musica | null = null;
  if (c.musica != null) {
    const m = c.musica as Partial<Musica>;
    if (!Array.isArray(m.faixas) || m.faixas.length === 0 || m.faixas.length > MAX_FAIXAS) return invalido;
    const faixas: FaixaMusica[] = [];
    for (const bruta of m.faixas as Partial<FaixaMusica>[]) {
      const url = urlDeAtivo(bruta?.url);
      const duracao = bruta?.duracao;
      if (!url || typeof duracao !== "number" || !(duracao > 0 && duracao <= 4 * 3600)) return invalido;
      faixas.push({ url, duracao });
    }
    const inicioEm = tempo(m.inicioEm);
    const pausadaEm = m.pausadaEm ?? null;
    if (inicioEm === null) return invalido;
    if (pausadaEm !== null && !(typeof pausadaEm === "number" && Number.isFinite(pausadaEm) && pausadaEm >= 0)) return invalido;
    if (typeof m.volume !== "number" || !(m.volume >= 0 && m.volume <= 1)) return invalido;
    if (!NIVEIS_DUCKING.includes(m.ducking as NivelDucking)) return invalido;
    musica = { faixas, inicioEm, pausadaEm, volume: m.volume, ducking: m.ducking as NivelDucking };
  }

  return { logo, overlay, fundo, midia, vinheta, musica };
}

export const MAX_NO_PALCO = 10;

const STATUS: StatusCena[] = ["ensaio", "ao_vivo", "intervalo", "encerrada"];

/** Lê e valida uma cena vinda de metadata ou de um pedido. Inválida → null. */
export function validarCena(dado: unknown): Cena | null {
  if (!dado || typeof dado !== "object") return null;
  const c = dado as Partial<Cena>;
  if (typeof c.versao !== "number" || !Number.isInteger(c.versao) || c.versao < 0) return null;
  if (typeof c.layoutId !== "string" || !LAYOUTS.some((l) => l.id === c.layoutId)) return null;
  if (!Array.isArray(c.noPalco) || c.noPalco.length > MAX_NO_PALCO) return null;
  if (!c.noPalco.every((id) => typeof id === "string" && id.length > 0 && id.length <= 64)) return null;
  if (new Set(c.noPalco).size !== c.noPalco.length) return null;
  const tamanhoSolo = c.tamanhoSolo ?? TAMANHO_SOLO.padrao; // cenas antigas, sem o campo
  if (typeof tamanhoSolo !== "number" || !Number.isInteger(tamanhoSolo)) return null;
  if (tamanhoSolo < TAMANHO_SOLO.min || tamanhoSolo > TAMANHO_SOLO.max) return null;
  const posicaoCameras = c.posicaoCameras ?? POSICAO_PADRAO; // cenas antigas, sem o campo
  if (!ehPosicaoCameras(posicaoCameras)) return null;
  const apresentacaoId = c.apresentacaoId ?? null;
  if (apresentacaoId !== null && (typeof apresentacaoId !== "string" || !apresentacaoId || apresentacaoId.length > 64)) return null;
  if (typeof c.status !== "string" || !STATUS.includes(c.status)) return null;
  const cores = validarCores(c.cores);
  if (!cores) return null;
  const noArDesde = typeof c.noArDesde === "number" && Number.isFinite(c.noArDesde) ? c.noArDesde : null;
  const encerradaEm = typeof c.encerradaEm === "number" && Number.isFinite(c.encerradaEm) ? c.encerradaEm : null;
  const comentarioDestacado = validarComentario(c.comentarioDestacado);
  if (comentarioDestacado === "invalido") return null;
  const estilo = validarEstilo(c.estilo);
  if (!estilo) return null;
  const banner = validarBanner(c.banner);
  if (banner === "invalido") return null;
  const etiquetasOcultas = c.etiquetasOcultas ?? [];
  if (!Array.isArray(etiquetasOcultas) || etiquetasOcultas.length > 20) return null;
  if (!etiquetasOcultas.every((id) => typeof id === "string" && id.length <= 64)) return null;
  const camerasOcultas = c.camerasOcultas ?? []; // cenas antigas, sem o campo
  if (!Array.isArray(camerasOcultas) || camerasOcultas.length > 20) return null;
  if (!camerasOcultas.every((id) => typeof id === "string" && id.length <= 64)) return null;
  const ativos = validarAtivos(c as Record<string, unknown>);
  if (ativos === "invalido") return null;
  return {
    versao: c.versao,
    layoutId: c.layoutId,
    tamanhoSolo,
    posicaoCameras,
    noPalco: c.noPalco,
    apresentacaoId,
    status: c.status,
    noArDesde,
    encerradaEm,
    cores,
    comentarioDestacado,
    estilo,
    etiquetasOcultas,
    camerasOcultas,
    banner,
    ...ativos,
  };
}

export function lerCena(metadata: string | undefined): Cena {
  if (!metadata) return CENA_INICIAL;
  try {
    return validarCena(JSON.parse(metadata)) ?? CENA_INICIAL;
  } catch {
    return CENA_INICIAL;
  }
}
