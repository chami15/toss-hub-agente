// Matemática isométrica — o único lugar do projeto que sabe converter
// coordenada de grade (tile) em pixel de tela.
//
// As constantes vêm da MEDIÇÃO dos sprites do Kenney Furniture Kit, não
// de teoria: escaneando os pixels opacos de `floorFull_NE.png` (208x153)
// o losango do topo mede 208 de largura por 146 de altura. Ou seja, o
// pack NÃO usa a proporção 2:1 do pixel art clássico — usa ~1.42:1.
// Usar o valor real é o que faz os tiles encaixarem sem fresta.

export const TILE_W = 208
export const TILE_H = 146

// Quanto 1 "andar" desloca pra cima, em pixels. Medido pela altura da
// face da parede (`wall_NE.png`).
export const TILE_ALTURA = 137

export interface Ponto {
  x: number
  y: number
}

// tile (coluna, linha) -> pixel. Aceita fração, o que permite encostar
// um móvel entre dois tiles.
export function paraTela(coluna: number, linha: number, altura = 0): Ponto {
  return {
    x: (coluna - linha) * (TILE_W / 2),
    y: (coluna + linha) * (TILE_H / 2) - altura * TILE_ALTURA,
  }
}

// Chave de z-ordering isométrico: quanto maior, mais à frente na cena e
// portanto mais tarde deve ser desenhado (sobrepondo quem está atrás).
export function profundidade(coluna: number, linha: number): number {
  return coluna + linha
}
