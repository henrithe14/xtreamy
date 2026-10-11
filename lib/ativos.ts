// Ativos de mídia (Etapa 10): tipos, limites e validação de URLs na cena.
// Arquivos no Supabase Storage, bucket público "ativos", pasta {user_id}/{tipo}/.

export type TipoAtivo = "logo" | "overlay" | "fundo" | "midia" | "vinheta" | "musica" | "efeito";
export type CategoriaMidia = "iniciar" | "volto-logo" | "finalizar" | "outras";

export const BUCKET_ATIVOS = "ativos";
/** Limite do plano gratuito do Supabase por arquivo. */
export const LIMITE_ARQUIVO = 50 * 1024 * 1024;

export const CATEGORIAS: { id: CategoriaMidia; nome: string }[] = [
  { id: "iniciar", nome: "Iniciar" },
  { id: "volto-logo", nome: "Volto logo" },
  { id: "finalizar", nome: "Finalizar" },
  { id: "outras", nome: "Outras" },
];

const IMAGENS = ["image/png", "image/jpeg", "image/webp"];
const VIDEOS = ["video/mp4", "video/webm"];
const AUDIOS = ["audio/mpeg", "audio/wav", "audio/ogg"];

/** Tipos de arquivo aceitos por tipo de ativo (seção 10.3). */
export const ACEITOS: Record<TipoAtivo, string[]> = {
  logo: IMAGENS,
  overlay: ["image/png", "image/webp"], // precisa de transparência
  fundo: [...IMAGENS, ...VIDEOS],
  midia: [...VIDEOS, ...IMAGENS],
  vinheta: VIDEOS,
  musica: AUDIOS,
  efeito: AUDIOS,
};

export const ehVideo = (mime: string) => mime.startsWith("video/");

/** Prefixo das URLs públicas do bucket: a cena só aceita arquivos daqui. */
export function prefixoPublico(): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${BUCKET_ATIVOS}/`;
}

export function urlPublica(caminho: string) {
  return `${prefixoPublico()}${caminho.split("/").map(encodeURIComponent).join("/")}`;
}

/** URL de ativo válida para pôr na cena (só do nosso bucket, sem truques de caminho). */
export function urlDeAtivo(dado: unknown): string | null {
  if (typeof dado !== "string" || dado.length > 600) return null;
  const prefixo = prefixoPublico();
  if (!prefixo.startsWith("https://") || !dado.startsWith(prefixo)) return null;
  const resto = dado.slice(prefixo.length);
  return /^[A-Za-z0-9%._-]+(\/[A-Za-z0-9%._-]+){2}$/.test(resto) && !resto.includes("..") ? dado : null;
}
