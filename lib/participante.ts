// Dados de um participante na sala, compartilhados entre servidor e navegador.

export type PapelSala = "host" | "convidado";

/** Como o diretor participa: aparecendo (apresentador) ou só controlando. */
export type ModoHost = "apresentador" | "diretor";

/** Gravado pelo servidor no token (metadata do participante). */
export type MetadadosParticipante = { papel: PapelSala; etiqueta: string; soDiretor: boolean };

export function lerMetadados(bruto: string | undefined): MetadadosParticipante {
  try {
    const dados = JSON.parse(bruto ?? "{}") as Partial<MetadadosParticipante>;
    const papel = dados.papel === "host" ? "host" : "convidado";
    return {
      papel,
      etiqueta: typeof dados.etiqueta === "string" ? dados.etiqueta : "",
      soDiretor: papel === "host" && dados.soDiretor === true,
    };
  } catch {
    return { papel: "convidado", etiqueta: "", soDiretor: false };
  }
}

/** Sala do LiveKit de cada transmissão. */
export function nomeSala(transmissaoId: string) {
  return `t-${transmissaoId}`;
}
