// Layouts ("Disposições"): slots em porcentagem do quadro 16:9 (1920×1080).
// Pessoas preenchem os slots na ordem de `noPalco` (CLAUDE.md, seção 8.3).

export type Slot = { x: number; y: number; w: number; h: number };

export type Layout = {
  id: string;
  nome: string;
  maxPessoas: number;
  /** Slots para n pessoas no palco (n já limitado a maxPessoas). `tamanho`: só o Solo usa. */
  slots: (n: number, tamanho?: number) => Slot[];
  /**
   * Layout de apresentação: onde fica a tela compartilhada, para n pessoas no palco.
   * Sem tela no ar, as pessoas usam a grade.
   */
  apresentacao?: (n: number) => Slot;
};

const MARGEM = 1.5;

/** Solo: tamanho da câmera em % do quadro (menor deixa o fundo aparecer em volta). */
export const TAMANHO_SOLO = { min: 40, max: 100, padrao: 100 } as const;
const MAX_PALCO = 10;

/** Grade automática: colunas ≈ raiz de n; a última linha incompleta fica centralizada. */
export function slotsGrade(n: number): Slot[] {
  if (n <= 0) return [];
  if (n === 1) return [{ x: 0, y: 0, w: 100, h: 100 }];
  const colunas = Math.ceil(Math.sqrt(n));
  const linhas = Math.ceil(n / colunas);
  const w = (100 - MARGEM * (colunas + 1)) / colunas;
  const h = (100 - MARGEM * (linhas + 1)) / linhas;
  return Array.from({ length: n }, (_, i) => {
    const linha = Math.floor(i / colunas);
    const naLinha = linha === linhas - 1 ? n - linha * colunas : colunas;
    const recuo = ((colunas - naLinha) * (w + MARGEM)) / 2;
    const coluna = i % colunas;
    return { x: MARGEM + recuo + coluna * (w + MARGEM), y: MARGEM + linha * (h + MARGEM), w, h };
  });
}

export const LAYOUTS: Layout[] = [
  {
    id: "solo",
    nome: "Solo",
    maxPessoas: 1,
    // Câmera centralizada, sempre 16:9; com menos de 100% o fundo aparece em volta.
    slots: (_, tamanho = TAMANHO_SOLO.padrao) => [{ x: (100 - tamanho) / 2, y: (100 - tamanho) / 2, w: tamanho, h: tamanho }],
  },
  {
    id: "lado-a-lado",
    nome: "Lado a lado",
    maxPessoas: 4,
    // Todos numa linha, mesma altura. A altura é limitada para nenhuma câmera ficar mais
    // estreita que 3:4 (em % do quadro 16:9: h ≤ w × 16 / (9 × 0,75)); centralizado na vertical.
    slots: (n) => {
      if (n <= 1) return [{ x: 0, y: 0, w: 100, h: 100 }];
      const w = (100 - MARGEM * (n + 1)) / n;
      const h = Math.min(92, (w * 16) / (9 * 0.75));
      const y = (100 - h) / 2;
      return Array.from({ length: n }, (_, i) => ({ x: MARGEM + i * (w + MARGEM), y, w, h }));
    },
  },
  {
    id: "grade",
    nome: "Grade",
    maxPessoas: 10,
    slots: slotsGrade,
  },
  {
    id: "destaque",
    nome: "Destaque",
    maxPessoas: 5,
    slots: (n) => {
      if (n <= 1) return [{ x: 0, y: 0, w: 100, h: 100 }];
      const miniaturas = n - 1;
      const hMini = 22.5;
      const total = miniaturas * hMini + (miniaturas - 1) * MARGEM;
      const topo = (100 - total) / 2;
      return [
        { x: MARGEM, y: 2, w: 74, h: 96 },
        ...Array.from({ length: miniaturas }, (_, i) => ({
          x: 75.5 + MARGEM,
          y: topo + i * (hMini + MARGEM),
          w: 100 - 75.5 - MARGEM * 2,
          h: hMini,
        })),
      ];
    },
  },
  {
    id: "apresentacao",
    nome: "Apresentação",
    maxPessoas: 4,
    // Tela grande à esquerda; câmeras 16:9 empilhadas à direita, centralizadas.
    apresentacao: (n) => (n === 0 ? { x: 0, y: 0, w: 100, h: 100 } : { x: MARGEM, y: 2, w: 76, h: 96 }),
    slots: (n) => {
      const x = 76 + MARGEM * 2;
      const w = 100 - x - MARGEM;
      const h = w; // em % do quadro: largura e altura iguais em % dão 16:9 em pixels
      const total = n * h + (n - 1) * MARGEM;
      const topo = (100 - total) / 2;
      return Array.from({ length: n }, (_, i) => ({ x, y: topo + i * (h + MARGEM), w, h }));
    },
  },
  {
    id: "so-tela",
    nome: "Só a tela",
    // Ninguém aparece, mas quem está no palco continua sendo ouvido (quem apresenta fala).
    maxPessoas: MAX_PALCO,
    apresentacao: () => ({ x: 0, y: 0, w: 100, h: 100 }),
    slots: () => [],
  },
];

export const LAYOUT_PADRAO = "grade";
/** Layout escolhido ao mostrar uma tela quando o atual não tem lugar para ela. */
export const LAYOUT_APRESENTACAO = "apresentacao";

/** O layout mostra pessoas? ("Só a tela" não: quem está no palco só é ouvido.) */
export const mostraPessoas = (layout: Layout) => layout.slots(1).length > 0;

export function obterLayout(id: string): Layout {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS.find((l) => l.id === LAYOUT_PADRAO)!;
}
