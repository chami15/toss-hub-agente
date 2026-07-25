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
  altura?: number
  desempate?: number
}

// Passo 1 de reorganização: só as mesas, nada de cadeira/monitor/
// decoração — pra fechar posição e orientação antes de vestir o resto.
export const TAPETES: Movel[] = []

const CENTRO = 3 // COLUNAS/LINHAS = 7, centro do grid = índice 3

// As 4 mesas de agente em "caixa": duas duplas viradas uma pra outra.
//
// Deslocar só a COLUNA anda na diagonal da tela (é o eixo do losango),
// não faz duas mesas ficarem "lado a lado" de verdade. Pra um
// deslocamento puramente HORIZONTAL na tela, precisa mexer coluna e
// linha em direções opostas ao mesmo tempo — (+e,-e). Pra um
// deslocamento puramente VERTICAL (o corredor entre as duplas), mexe
// os dois na MESMA direção — (+d,+d). É a mesma matemática de
// paraTela, só isolando os dois eixos de tela.
const D_CORREDOR = 0.4 // metade do afastamento entre as duas duplas
const E_DUPLA = 0.4 // metade do afastamento entre as 2 mesas de cada dupla

// dupla de cima (linha menor): olha pra baixo, pro corredor (SE)
// dupla de baixo (linha maior): olha pra cima, pro corredor (NW)
const MESA_ESQ_CIMA = { coluna: CENTRO - D_CORREDOR - E_DUPLA, linha: CENTRO - D_CORREDOR + E_DUPLA }
const MESA_DIR_CIMA = { coluna: CENTRO - D_CORREDOR + E_DUPLA, linha: CENTRO - D_CORREDOR - E_DUPLA }
const MESA_ESQ_BAIXO = { coluna: CENTRO + D_CORREDOR - E_DUPLA, linha: CENTRO + D_CORREDOR + E_DUPLA }
const MESA_DIR_BAIXO = { coluna: CENTRO + D_CORREDOR + E_DUPLA, linha: CENTRO + D_CORREDOR - E_DUPLA }

export const MOVEIS: Movel[] = [
  // mesa do chefe — mesma posição de sempre, agora virada pra fora
  // (era 'SE', o espelho é 'NW')
  { peca: 'deskCorner', direcao: 'NW', coluna: 1, linha: 1 },

  // dupla de cima, olhando pra baixo (pro corredor)
  { peca: 'desk', direcao: 'SE', ...MESA_ESQ_CIMA },
  { peca: 'desk', direcao: 'SE', ...MESA_DIR_CIMA },

  // dupla de baixo, olhando pra cima (pro corredor) — espelhada
  { peca: 'desk', direcao: 'NW', ...MESA_ESQ_BAIXO },
  { peca: 'desk', direcao: 'NW', ...MESA_DIR_BAIXO },
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
