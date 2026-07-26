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

// Recorte circular do retrato de cada agente: centro (fração da
// imagem original) + raio (fração da LARGURA da imagem). Calibrado
// olhando cada retrato — os 4 têm enquadramento levemente diferente,
// então não dá pra usar um valor único pra todos.
export interface RecorteRetrato {
  cx: number
  cy: number
  raio: number
}

export const RECORTES: Record<string, RecorteRetrato> = {
  cifra: { cx: 0.46, cy: 0.37, raio: 0.36 },
  agenda: { cx: 0.48, cy: 0.35, raio: 0.36 },
  vita: { cx: 0.5, cy: 0.37, raio: 0.38 },
  norte: { cx: 0.45, cy: 0.3, raio: 0.32 },
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

// --- Coordenada de tabuleiro -------------------------------------
// A planta é um 7x7, então tratamos como um tabuleiro de xadrez:
// letra = coluna (A..G), número = linha (1..7). A mesa do chefe, por
// exemplo, fica em B2. É essa a linguagem que a gente usa pra falar
// de posição — bem menos ambíguo que "um pouco pra esquerda".
export function casa(ref: string): { coluna: number; linha: number } {
  const letra = ref[0].toUpperCase()
  const numero = Number(ref.slice(1))
  return {
    coluna: letra.charCodeAt(0) - 'A'.charCodeAt(0),
    linha: numero - 1,
  }
}

// Um móvel que fica na DIVISA entre duas casas (ocupa as duas pela
// metade) — o centro dele é o ponto médio entre elas.
export function entre(refA: string, refB: string): { coluna: number; linha: number } {
  const a = casa(refA)
  const b = casa(refB)
  return {
    coluna: (a.coluna + b.coluna) / 2,
    linha: (a.linha + b.linha) / 2,
  }
}

// Um posto de trabalho: mesa (com sua posição/direção) + a cadeira do
// lado de FORA do pod (pra a pessoa olhar pra dentro, em direção ao
// corredor entre as duas duplas) + o agente que senta ali (usado por
// cena.ts pra colocar o retrato).
export interface Posto {
  agenteId: string
  mesaPeca: string
  mesaDirecao: Direcao
  coluna: number
  linha: number
  cadeiraDirecao: Direcao
  // deslocamento puramente VERTICAL na tela (mesma direção em coluna e
  // linha) pra empurrar a cadeira pro lado de fora do pod
  deltaCadeira: number
}

const D_CADEIRA = 0.62

export const POSTOS: Posto[] = [
  {
    agenteId: 'cifra',
    mesaPeca: 'desk',
    mesaDirecao: 'NW',
    ...entre('D4', 'E4'),
    cadeiraDirecao: 'SE',
    deltaCadeira: -D_CADEIRA,
  },
  {
    agenteId: 'agenda',
    mesaPeca: 'desk',
    mesaDirecao: 'NW',
    ...entre('E4', 'F4'),
    cadeiraDirecao: 'SE',
    deltaCadeira: -D_CADEIRA,
  },
  {
    agenteId: 'vita',
    mesaPeca: 'desk',
    mesaDirecao: 'SW',
    ...entre('D5', 'E5'),
    cadeiraDirecao: 'NE',
    deltaCadeira: D_CADEIRA,
  },
  {
    agenteId: 'norte',
    mesaPeca: 'desk',
    mesaDirecao: 'SW',
    ...entre('E5', 'F5'),
    cadeiraDirecao: 'NE',
    deltaCadeira: D_CADEIRA,
  },
]

export const MOVEIS: Movel[] = [
  // mesa do chefe — B2, virada NE (sem avatar por enquanto)
  { peca: 'deskCorner', direcao: 'NE', ...casa('B2') },

  ...POSTOS.flatMap((p): Movel[] => [
    { peca: p.mesaPeca, direcao: p.mesaDirecao, coluna: p.coluna, linha: p.linha },
    {
      peca: 'computerScreen',
      direcao: p.mesaDirecao,
      coluna: p.coluna,
      linha: p.linha,
      altura: 0.16,
      desempate: 2,
    },
    {
      peca: 'chairDesk',
      direcao: p.cadeiraDirecao,
      coluna: p.coluna + p.deltaCadeira,
      linha: p.linha + p.deltaCadeira,
      desempate: 4,
    },
  ]),
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
