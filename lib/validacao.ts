// Validações puras, usadas pelas ações de criar e de configurar a live.

/** Vazio = sem agendamento; senão uma data ISO entre agora e 1 ano. */
export function lerAgendamento(bruto: string): string | null | "invalido" {
  if (!bruto) return null;
  const data = new Date(bruto);
  const agora = Date.now();
  if (Number.isNaN(data.getTime())) return "invalido";
  if (data.getTime() < agora + 60_000 || data.getTime() > agora + 365 * 24 * 3600_000) return "invalido";
  return data.toISOString();
}

export const LIMITE_TAGS = 500;

/**
 * Tags separadas por vírgula, sem repetidas. O YouTube conta no limite de 500 as
 * vírgulas e as aspas que ele põe em tags com espaço.
 */
export function lerTags(bruto: string): string[] | "longas" {
  const tags = [...new Set(bruto.split(",").map((t) => t.trim().replace(/[<>]/g, "")).filter(Boolean))];
  const tamanho = tags.reduce((soma, t) => soma + t.length + (t.includes(" ") ? 2 : 0), 0) + Math.max(0, tags.length - 1);
  return tamanho > LIMITE_TAGS ? "longas" : tags;
}

export const IDIOMAS = [
  { codigo: "pt-BR", nome: "Português (Brasil)" },
  { codigo: "pt-PT", nome: "Português (Portugal)" },
  { codigo: "es", nome: "Espanhol" },
  { codigo: "en", nome: "Inglês" },
  { codigo: "fr", nome: "Francês" },
  { codigo: "it", nome: "Italiano" },
  { codigo: "de", nome: "Alemão" },
  { codigo: "ja", nome: "Japonês" },
] as const;

export const TIPOS_CAPA = ["image/jpeg", "image/png"] as const;
export const LIMITE_CAPA = 2 * 1024 * 1024;
