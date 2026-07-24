// Matemática de conversão de coordenadas de grade (coluna/linha) pra
// posição de tela, no ângulo isométrico clássico (proporção 2:1) — a
// mesma lógica usada em qualquer jogo isométrico. Cada passo em coluna
// desloca a tela pra direita+baixo; cada passo em linha desloca pra
// esquerda+baixo. É a base de tudo (piso, paredes, e depois móveis).
export const TILE_W = 80
export const TILE_H = 40
export const ALTURA_PAREDE = 110

export interface PontoTela {
  x: number
  y: number
}

export function paraTela(coluna: number, linha: number): PontoTela {
  return {
    x: (coluna - linha) * (TILE_W / 2),
    y: (coluna + linha) * (TILE_H / 2),
  }
}
