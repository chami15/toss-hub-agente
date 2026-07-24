// IsoMath — conversão de coordenadas de grade (tile) pra pixel de tela,
// projeção isométrica 2:1 clássica. Único lugar que sabe essa
// matemática; Room, Entity e Renderer só chamam tileParaPixel.
export const TILE_W = 70
export const TILE_H = 35

export interface PontoPixel {
  x: number
  y: number
}

// coluna/linha podem ser fracionários (útil pra centralizar móveis
// entre tiles ou dar footprint maior que 1x1).
export function tileParaPixel(coluna: number, linha: number): PontoPixel {
  return {
    x: (coluna - linha) * (TILE_W / 2),
    y: (coluna + linha) * (TILE_H / 2),
  }
}
