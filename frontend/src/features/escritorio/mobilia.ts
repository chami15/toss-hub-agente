import type { Direcao } from './sala'

// Onde ancorar cada sprite dentro do próprio PNG, em fração (0..1).
// Os valores saíram de um script que escaneia os pixels opacos e acha
// o ponto mais baixo de cada peça — o "pé" dela — e sobe meia altura
// de losango. Ajuste fino é feito olhando o resultado na tela.
export interface Ancora {
  x: number
  y: number
}

export const ANCORAS: Record<string, Ancora> = {
  floorFull: { x: 0.5, y: 0.477 },
  wall: { x: 0.491, y: 0.823 },
  wallWindow: { x: 0.491, y: 0.823 },
  desk: { x: 0.5, y: 0.658 },
  deskCorner: { x: 0.5, y: 0.487 },
  chairDesk: { x: 0.5, y: 0.717 },
  computerScreen: { x: 0.5, y: 0.688 },
  laptop: { x: 0.5, y: 0.455 },
  loungeSofa: { x: 0.5, y: 0.626 },
  tableCoffee: { x: 0.5, y: 0.616 },
  pottedPlant: { x: 0.5, y: 0.873 },
  bookcaseOpen: { x: 0.5, y: 0.822 },
  rugSquare: { x: 0.5, y: 0.505 },
  trashcan: { x: 0.5, y: 0.797 },
  lampSquareFloor: { x: 0.5, y: 0.912 },
}

export const ANCORA_PADRAO: Ancora = { x: 0.5, y: 0.7 }

export function ancoraDe(peca: string): Ancora {
  return ANCORAS[peca] ?? ANCORA_PADRAO
}

export interface Movel {
  peca: string
  direcao: Direcao
  coluna: number
  linha: number
  // empilhamento em "andares": 0 = no chão. Um monitor em cima da mesa
  // usa uma fração (a altura do tampo).
  altura?: number
  // empurra a peça na ordem de desenho sem mudar a posição — usado
  // quando duas peças dividem o mesmo tile (monitor em cima da mesa).
  desempate?: number
}

// Tapetes ficam numa camada própria: no chão, acima do piso, abaixo de
// qualquer móvel. Assim nunca disputam z-order com a mobília.
export const TAPETES: Movel[] = [
  { peca: 'rugSquare', direcao: 'NE', coluna: 3, linha: 3 },
]

// Um posto de trabalho = mesa + cadeira + monitor, sempre com o mesmo
// arranjo relativo. Evita repetir (e errar) as 3 posições em cada mesa.
function postoDeTrabalho(
  coluna: number,
  linha: number,
  mesa = 'desk',
  alturaMonitor = 0.16,
): Movel[] {
  return [
    { peca: mesa, direcao: 'SE', coluna, linha },
    { peca: 'computerScreen', direcao: 'SE', coluna, linha, altura: alturaMonitor, desempate: 2 },
    { peca: 'chairDesk', direcao: 'NW', coluna, linha: linha + 0.62, desempate: 4 },
  ]
}

// A mobília da sala. Editar aqui = mudar o ambiente; nenhum componente
// precisa mudar.
export const MOVEIS: Movel[] = [
  // mesa do chefe, no fundo, de canto (o tampo da mesa de canto fica
  // mais baixo na imagem que o da mesa comum, daí o monitor mais baixo)
  ...postoDeTrabalho(1, 1, 'deskCorner', -0.02),

  // as 4 mesas de agente, em dois pares
  ...postoDeTrabalho(4, 1.5),
  ...postoDeTrabalho(5.5, 3),
  ...postoDeTrabalho(1.5, 4),
  ...postoDeTrabalho(3, 5.5),

  // canto de descompressão, recuado da borda pra não ficar pendurado
  { peca: 'loungeSofa', direcao: 'NW', coluna: 5.2, linha: 5.2 },
  { peca: 'tableCoffee', direcao: 'SE', coluna: 6.1, linha: 5.5 },

  // estantes encostadas nas paredes do fundo
  { peca: 'bookcaseOpen', direcao: 'SE', coluna: 0, linha: 0 },
  { peca: 'bookcaseOpen', direcao: 'SE', coluna: 2.5, linha: 0 },
  { peca: 'bookcaseOpen', direcao: 'SW', coluna: 0, linha: 2.5 },

  // decoração
  { peca: 'pottedPlant', direcao: 'NE', coluna: 6, linha: 0.2 },
  { peca: 'pottedPlant', direcao: 'NE', coluna: 0.2, linha: 6 },
  { peca: 'pottedPlant', direcao: 'NE', coluna: 6.3, linha: 3.6 },
  { peca: 'lampSquareFloor', direcao: 'NE', coluna: 0.3, linha: 3.2 },
  { peca: 'trashcan', direcao: 'NE', coluna: 3.6, linha: 0.4 },
]

// Todas as peças usadas — pra pré-carregar as texturas antes de montar.
export function pecasUsadas(): { peca: string; direcao: Direcao }[] {
  const vistas = new Set<string>()
  const lista: { peca: string; direcao: Direcao }[] = []
  for (const m of [...TAPETES, ...MOVEIS]) {
    const chave = `${m.peca}_${m.direcao}`
    if (!vistas.has(chave)) {
      vistas.add(chave)
      lista.push({ peca: m.peca, direcao: m.direcao })
    }
  }
  return lista
}
