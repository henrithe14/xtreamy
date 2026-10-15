// Layout de apresentação: a tela compartilhada aparece na proporção real (nunca cortada) e
// as câmeras se ajustam ao espaço que sobra, na posição escolhida. Conta em pixels do
// quadro 1920×1080 e devolve slots em % (como os outros layouts).

import type { Slot } from "@/lib/layouts";

export type PosicaoCameras = "direita" | "esquerda" | "cima" | "baixo" | "laterais" | "cima-baixo" | "L";

export const POSICOES_CAMERAS: { id: PosicaoCameras; nome: string }[] = [
  { id: "direita", nome: "À direita" },
  { id: "esquerda", nome: "À esquerda" },
  { id: "baixo", nome: "Embaixo" },
  { id: "cima", nome: "Em cima" },
  { id: "laterais", nome: "Dos dois lados" },
  { id: "cima-baixo", nome: "Em cima e embaixo" },
  { id: "L", nome: "Em L" },
];

export const POSICAO_PADRAO: PosicaoCameras = "direita";
export const ehPosicaoCameras = (v: unknown): v is PosicaoCameras => POSICOES_CAMERAS.some((p) => p.id === v);

const W = 1920;
const H = 1080;
const MARGEM = 29; // ~1,5% da largura, igual aos outros layouts
const VAO = 24;
/** Largura de cada câmera: entre 16% e 45% do quadro. */
const CAM_MIN = W * 0.16;
const CAM_MAX = W * 0.45;
/** Peso da área das câmeras perto da área da tela (a tela importa mais). */
const PESO_CAMERAS = 0.6;

type Caixa = { x: number; y: number; w: number; h: number };

/** Maior caixa com a proporção `p` (largura/altura) que cabe em w × h. */
function caber(p: number, w: number, h: number) {
  if (w <= 0 || h <= 0) return { w: 0, h: 0 };
  return w / h > p ? { w: h * p, h } : { w, h: w / p };
}

/** Largura de câmera (16:9) para k câmeras numa coluna que cabe na altura `alt`. */
const larguraColuna = (cw: number, k: number, alt: number) => Math.min(cw, (((alt - (k - 1) * VAO) / k) * 16) / 9);
/** Largura de câmera para k câmeras numa linha que cabe na largura `larg`. */
const larguraLinha = (cw: number, k: number, larg: number) => Math.min(cw, (larg - (k - 1) * VAO) / k);

function coluna(k: number, cw: number, x: number, yCentro: number): Caixa[] {
  const ch = (cw * 9) / 16;
  const total = k * ch + (k - 1) * VAO;
  return Array.from({ length: k }, (_, i) => ({ x, y: yCentro - total / 2 + i * (ch + VAO), w: cw, h: ch }));
}

function linha(k: number, cw: number, xCentro: number, y: number): Caixa[] {
  const ch = (cw * 9) / 16;
  const total = k * cw + (k - 1) * VAO;
  return Array.from({ length: k }, (_, i) => ({ x: xCentro - total / 2 + i * (cw + VAO), y, w: cw, h: ch }));
}

const altColuna = (k: number, cw: number) => (k > 0 ? k * ((cw * 9) / 16) + (k - 1) * VAO : 0);
const largLinha = (k: number, cw: number) => (k > 0 ? k * cw + (k - 1) * VAO : 0);

/** Monta a disposição para uma largura de câmera candidata. O grupo todo fica centralizado. */
function montar(posicao: PosicaoCameras, n: number, p: number, candidato: number): { tela: Caixa; pessoas: Caixa[] } {
  const livreW = W - 2 * MARGEM;
  const livreH = H - 2 * MARGEM;
  const metade = Math.ceil(n / 2);
  const resto = n - metade;

  if (posicao === "direita" || posicao === "esquerda" || posicao === "laterais") {
    const [kA, kB] = posicao === "laterais" ? [metade, resto] : [n, 0];
    const cw = larguraColuna(candidato, Math.max(kA, 1), livreH);
    const colunas = kB > 0 ? 2 : 1;
    const t = caber(p, livreW - colunas * (cw + VAO), livreH);
    const grupoW = t.w + colunas * (cw + VAO);
    const x0 = (W - grupoW) / 2;
    const yc = H / 2;
    if (posicao === "direita") {
      return { tela: { x: x0, y: yc - t.h / 2, ...t }, pessoas: coluna(kA, cw, x0 + t.w + VAO, yc) };
    }
    if (posicao === "esquerda") {
      return { tela: { x: x0 + cw + VAO, y: yc - t.h / 2, ...t }, pessoas: coluna(kA, cw, x0, yc) };
    }
    // Dos dois lados: a primeira metade à esquerda, o resto à direita.
    const esquerda = x0;
    const xTela = esquerda + cw + VAO;
    return {
      tela: { x: xTela, y: yc - t.h / 2, ...t },
      pessoas: [...coluna(kA, cw, esquerda, yc), ...coluna(kB, cw, xTela + t.w + VAO, yc)],
    };
  }

  if (posicao === "cima" || posicao === "baixo" || posicao === "cima-baixo") {
    const [kA, kB] = posicao === "cima-baixo" ? [metade, resto] : [n, 0];
    const cw = larguraLinha(candidato, Math.max(kA, 1), livreW);
    const ch = (cw * 9) / 16;
    const linhas = kB > 0 ? 2 : 1;
    const t = caber(p, livreW, livreH - linhas * (ch + VAO));
    const grupoH = t.h + linhas * (ch + VAO);
    const y0 = (H - grupoH) / 2;
    const xc = W / 2;
    if (posicao === "baixo") {
      return { tela: { x: xc - t.w / 2, y: y0, ...t }, pessoas: linha(kA, cw, xc, y0 + t.h + VAO) };
    }
    if (posicao === "cima") {
      return { tela: { x: xc - t.w / 2, y: y0 + ch + VAO, ...t }, pessoas: linha(kA, cw, xc, y0) };
    }
    const yTela = y0 + ch + VAO;
    return {
      tela: { x: xc - t.w / 2, y: yTela, ...t },
      pessoas: [...linha(kA, cw, xc, y0), ...linha(kB, cw, xc, yTela + t.h + VAO)],
    };
  }

  // Em L: coluna à direita (primeira metade) e linha embaixo da tela (o resto).
  const kCol = n === 1 ? 1 : metade;
  const kLin = n - kCol;
  let cw = larguraColuna(candidato, kCol, livreH);
  if (kLin > 0) cw = larguraLinha(cw, kLin, livreW - cw - VAO);
  const ch = (cw * 9) / 16;
  const t = caber(p, livreW - cw - VAO, livreH - (kLin > 0 ? ch + VAO : 0));
  const blocoW = Math.max(t.w, largLinha(kLin, cw));
  const grupoW = blocoW + VAO + cw;
  const grupoH = Math.max(t.h + (kLin > 0 ? ch + VAO : 0), altColuna(kCol, cw));
  const x0 = (W - grupoW) / 2;
  const y0 = (H - grupoH) / 2;
  const xTela = x0 + (blocoW - t.w) / 2;
  return {
    tela: { x: xTela, y: y0, ...t },
    pessoas: [...coluna(kCol, cw, x0 + blocoW + VAO, y0 + altColuna(kCol, cw) / 2), ...linha(kLin, cw, x0 + blocoW / 2, y0 + t.h + VAO)],
  };
}

const area = (c: { w: number; h: number }) => c.w * c.h;
const emPorcento = (c: Caixa): Slot => ({ x: (c.x / W) * 100, y: (c.y / H) * 100, w: (c.w / W) * 100, h: (c.h / H) * 100 });

/**
 * Tela + câmeras para n pessoas. `proporcao`: largura/altura da tela compartilhada.
 * Testa vários tamanhos de câmera e fica com o que melhor aproveita o quadro: com uma
 * janela estreita as câmeras crescem; com uma tela larga elas encolhem.
 */
export function disporApresentacao(n: number, proporcao: number, posicao: PosicaoCameras): { tela: Slot; pessoas: Slot[] } {
  const p = Number.isFinite(proporcao) && proporcao > 0.2 && proporcao < 6 ? proporcao : 16 / 9;
  if (n <= 0) {
    const t = caber(p, W, H);
    return { tela: emPorcento({ x: (W - t.w) / 2, y: (H - t.h) / 2, ...t }), pessoas: [] };
  }
  const maior = caber(p, W - 2 * MARGEM, H - 2 * MARGEM);
  let melhor: { tela: Caixa; pessoas: Caixa[] } | undefined;
  let melhorNota = -1;
  const passos = 24;
  for (let i = 0; i <= passos; i++) {
    const candidato = CAM_MIN + ((CAM_MAX - CAM_MIN) * i) / passos;
    const d = montar(posicao, n, p, candidato);
    // A tela é o assunto: mantém pelo menos metade do tamanho que teria sozinha no quadro.
    if (area(d.tela) < 0.5 * area(maior)) continue;
    const nota = area(d.tela) + PESO_CAMERAS * d.pessoas.reduce((s, c) => s + area(c), 0);
    if (nota > melhorNota) {
      melhorNota = nota;
      melhor = d;
    }
  }
  const final = melhor ?? montar(posicao, n, p, CAM_MIN);
  return { tela: emPorcento(final.tela), pessoas: final.pessoas.map(emPorcento) };
}
