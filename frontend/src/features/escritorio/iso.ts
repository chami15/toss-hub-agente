// Matemática isométrica — o único lugar do projeto que sabe converter
// coordenada de grade (tile) em coordenada de tela. Proporção 2:1
// (largura do losango = 2x a altura), a mesma do Habbo.
//
// Tudo mais (piso, paredes, móveis, agentes) posiciona as coisas em
// TILE, nunca em pixel. Assim mudar a escala do mundo inteiro é mexer
// em duas constantes aqui.

// 208x104: tamanho nativo dos sprites do Kenney Furniture Kit
// (`floorFull_NE.png`), confirmado testando o encaixe lado a lado.
// Usar o tamanho nativo em vez de redimensionar mantém os PNGs nítidos.
export const TILE_W = 208
export const TILE_H = 104

// Altura (em pixels de tela) que 1 unidade de "andar acima do chão"
// desloca pra cima. Usado por parede e por móvel empilhado.
export const TILE_ALTURA = 104

export interface Ponto {
  x: number
  y: number
}

// Converte tile (coluna, linha) -> pixel de tela. Aceita valores
// fracionários, o que permite posicionar um móvel entre tiles.
export function paraTela(coluna: number, linha: number, altura = 0): Ponto {
  return {
    x: (coluna - linha) * (TILE_W / 2),
    y: (coluna + linha) * (TILE_H / 2) - altura * TILE_ALTURA,
  }
}

// Chave de profundidade pra ordenar o que desenha primeiro. Quanto
// maior, mais "na frente" da cena o objeto está e mais tarde deve ser
// desenhado (sobrepondo quem está atrás). É o z-ordering isométrico.
export function profundidade(coluna: number, linha: number): number {
  return coluna + linha
}

// Os 4 vértices do losango de um tile, em pixel, relativos ao centro
// do tile. Ordem: topo, direita, base, esquerda.
export function verticesDoLosango(): Ponto[] {
  const hw = TILE_W / 2
  const hh = TILE_H / 2
  return [
    { x: 0, y: -hh },
    { x: hw, y: 0 },
    { x: 0, y: hh },
    { x: -hw, y: 0 },
  ]
}
