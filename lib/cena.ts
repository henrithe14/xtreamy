// Estado da cena: fonte única da verdade do que vai ao ar (CLAUDE.md, seção 7).
// Fica nos metadata da sala do LiveKit; só o servidor grava (a pedido do diretor).
// Campos de artes, mídias, widgets etc. entram nas etapas correspondentes.

import { LAYOUTS, LAYOUT_PADRAO } from "@/lib/layouts";

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
};

export const CENA_INICIAL: Cena = {
  versao: 0,
  layoutId: LAYOUT_PADRAO,
  noPalco: [],
  status: "ensaio",
  noArDesde: null,
  cores: CORES_PADRAO,
  comentarioDestacado: null,
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
  return {
    versao: c.versao,
    layoutId: c.layoutId,
    noPalco: c.noPalco,
    status: c.status,
    noArDesde,
    cores,
    comentarioDestacado,
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
