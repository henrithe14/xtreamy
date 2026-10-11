// Estilo visual da live (Etapa 9): tema das artes, fonte e moldura da câmera.
// Fica dentro da cena; as cores vêm de cena.cores (cores da marca).

export type Tema = "bolha" | "minimo" | "classico" | "bloco";
export type FormatoCamera = "retangulo" | "arredondado" | "circulo";

export type EstiloCamera = {
  /** Espessura da borda em pixels do quadro 1920×1080 (0 a 12). */
  borda: number;
  corBorda: string;
  formato: FormatoCamera;
};

export type Estilo = { tema: Tema; fonte: string; camera: EstiloCamera };

export const TEMAS: { id: Tema; nome: string; descricao: string }[] = [
  { id: "bolha", nome: "Bolha", descricao: "Pílulas na cor da marca" },
  { id: "minimo", nome: "Mínimo", descricao: "Só texto, com um fio de cor" },
  { id: "classico", nome: "Clássico", descricao: "Faixa escura com barra de cor" },
  { id: "bloco", nome: "Bloco", descricao: "Blocos sólidos, cantos retos" },
];

/** Fontes curadas do Google Fonts (nome exato da família). */
export const FONTES = [
  "Archivo",
  "Inter",
  "Montserrat",
  "Poppins",
  "Barlow",
  "DM Sans",
  "Space Grotesk",
  "Oswald",
  "Bebas Neue",
  "Roboto Condensed",
  "Playfair Display",
  "Merriweather",
] as const;

export const FORMATOS: { id: FormatoCamera; nome: string }[] = [
  { id: "retangulo", nome: "Retângulo" },
  { id: "arredondado", nome: "Arredondado" },
  { id: "circulo", nome: "Círculo" },
];

export const ESTILO_PADRAO: Estilo = {
  tema: "classico",
  fonte: "Archivo",
  camera: { borda: 0, corBorda: "#ffffff", formato: "arredondado" },
};

const HEX = /^#[0-9a-f]{6}$/i;

/** Valida um estilo vindo da cena ou de um pedido. Ausente → padrão; inválido → null. */
export function validarEstilo(dado: unknown): Estilo | null {
  if (dado === undefined) return ESTILO_PADRAO;
  if (!dado || typeof dado !== "object") return null;
  const e = dado as Partial<Estilo>;
  if (!TEMAS.some((t) => t.id === e.tema)) return null;
  if (typeof e.fonte !== "string" || !(FONTES as readonly string[]).includes(e.fonte)) return null;
  const c = e.camera as Partial<EstiloCamera> | undefined;
  if (!c || typeof c.borda !== "number" || c.borda < 0 || c.borda > 12) return null;
  if (typeof c.corBorda !== "string" || !HEX.test(c.corBorda)) return null;
  if (!FORMATOS.some((f) => f.id === c.formato)) return null;
  return {
    tema: e.tema as Tema,
    fonte: e.fonte,
    camera: { borda: Math.round(c.borda), corBorda: c.corBorda.toLowerCase(), formato: c.formato as FormatoCamera },
  };
}

/** URL do CSS do Google Fonts para a família (pesos usados nas artes). */
export function urlFonte(fonte: string) {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fonte).replace(/%20/g, "+")}:wght@400;600;700&display=block`;
}

// ---------- Banner ----------

export type EstiloBanner = "faixa" | "letreiro";
export type Banner = { texto: string; estilo: EstiloBanner };
export const LIMITE_BANNER = 200;

export function validarBanner(dado: unknown): Banner | null | "invalido" {
  if (dado === undefined || dado === null) return null;
  if (typeof dado !== "object") return "invalido";
  const b = dado as Partial<Banner>;
  if (typeof b.texto !== "string" || !b.texto.trim() || b.texto.length > LIMITE_BANNER) return "invalido";
  if (b.estilo !== "faixa" && b.estilo !== "letreiro") return "invalido";
  return { texto: b.texto.trim(), estilo: b.estilo };
}
