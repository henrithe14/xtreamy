// Estado da cena: fonte única da verdade do que vai ao ar (CLAUDE.md, seção 7).
// Fica nos metadata da sala do LiveKit; só o servidor grava (a pedido do diretor).
// Campos de artes, mídias, widgets etc. entram nas etapas correspondentes.

import { LAYOUTS, LAYOUT_PADRAO } from "@/lib/layouts";
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

export type Cena = {
  /** Cresce a cada alteração; serve para descartar respostas antigas. */
  versao: number;
  layoutId: string;
  /** Identities, na ordem dos slots. */
  noPalco: string[];
  status: StatusCena;
  /** Quando a live entrou no ar (ms desde 1970). Só o servidor define. */
  noArDesde: number | null;
  cores: CoresMarca;
  comentarioDestacado: ComentarioDestacado | null;
  estilo: Estilo;
  /** Identities cuja etiqueta (nome) não aparece na live. */
  etiquetasOcultas: string[];
  banner: Banner | null;
  logo: Logo | null;
  overlay: string | null;
  /** null = degradê das cores da marca. */
  fundo: Fundo | null;
  midia: Midia | null;
  vinheta: Vinheta | null;
};

export const CENA_INICIAL: Cena = {
  versao: 0,
  layoutId: LAYOUT_PADRAO,
  noPalco: [],
  status: "ensaio",
  noArDesde: null,
  cores: CORES_PADRAO,
  comentarioDestacado: null,
  estilo: ESTILO_PADRAO,
  etiquetasOcultas: [],
  banner: null,
  logo: null,
  overlay: null,
  fundo: null,
  midia: null,
  vinheta: null,
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

  return { logo, overlay, fundo, midia, vinheta };
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
  if (typeof c.status !== "string" || !STATUS.includes(c.status)) return null;
  const cores = validarCores(c.cores);
  if (!cores) return null;
  const noArDesde = typeof c.noArDesde === "number" && Number.isFinite(c.noArDesde) ? c.noArDesde : null;
  const comentarioDestacado = validarComentario(c.comentarioDestacado);
  if (comentarioDestacado === "invalido") return null;
  const estilo = validarEstilo(c.estilo);
  if (!estilo) return null;
  const banner = validarBanner(c.banner);
  if (banner === "invalido") return null;
  const etiquetasOcultas = c.etiquetasOcultas ?? [];
  if (!Array.isArray(etiquetasOcultas) || etiquetasOcultas.length > 20) return null;
  if (!etiquetasOcultas.every((id) => typeof id === "string" && id.length <= 64)) return null;
  const ativos = validarAtivos(c as Record<string, unknown>);
  if (ativos === "invalido") return null;
  return {
    versao: c.versao,
    layoutId: c.layoutId,
    noPalco: c.noPalco,
    status: c.status,
    noArDesde,
    cores,
    comentarioDestacado,
    estilo,
    etiquetasOcultas,
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
