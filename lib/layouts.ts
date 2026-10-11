// Layouts ("Disposições"): slots em porcentagem do quadro 16:9 (1920×1080).
// Pessoas preenchem os slots na ordem de `noPalco` (CLAUDE.md, seção 8.3).

export type Slot = { x: number; y: number; w: number; h: number };

export type Layout = {
  id: string;
  nome: string;
  maxPessoas: number;
  /** Slots para n pessoas no palco (n já limitado a maxPessoas). */
  slots: (n: number) => Slot[];
};

const MARGEM = 1.5;

/** Grade automática: colunas ≈ raiz de n; a última linha incompleta fica centralizada. */
function slotsGrade(n: number): Slot[] {
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
    slots: () => [{ x: 0, y: 0, w: 100, h: 100 }],
  },
  {
    id: "lado-a-lado",
    nome: "Lado a lado",
    maxPessoas: 2,
    slots: (n) => {
      if (n <= 1) return [{ x: 0, y: 0, w: 100, h: 100 }];
      const w = (100 - MARGEM * 3) / 2;
      return [
        { x: MARGEM, y: 4, w, h: 92 },
        { x: MARGEM * 2 + w, y: 4, w, h: 92 },
      ];
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
];

export const LAYOUT_PADRAO = "grade";

export function obterLayout(id: string): Layout {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS.find((l) => l.id === LAYOUT_PADRAO)!;
}
