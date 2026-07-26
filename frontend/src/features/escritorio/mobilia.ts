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
  // cy MAIOR sobe o rosto dentro do círculo (ancora um ponto mais pra
  // baixo da imagem original no centro do crachá, empurrando o rosto,
  // que fica acima desse ponto, pra cima)
  cifra: { cx: 0.49, cy: 0.4, raio: 0.34 },
  agenda: { cx: 0.48, cy: 0.35, raio: 0.36 },
  vita: { cx: 0.5, cy: 0.37, raio: 0.38 },
  norte: { cx: 0.5, cy: 0.36, raio: 0.34 },
}

export interface Movel {
  peca: string
  direcao: Direcao
  coluna: number
  linha: number
  altura?: number
  desempate?: number
  // Posição usada só pro CÁLCULO de profundidade (z-order), quando
  // difere de onde o sprite é desenhado. Necessário pro monitor: se ele
  // se desloca um pouco da mesa (ajuste fino), a profundidade dele pode
  // cair ABAIXO da profundidade da própria mesa — e aí ele desenha
  // atrás dela e some. Fixando a profundidade na posição da mesa,
  // isso não acontece.
  zColuna?: number
  zLinha?: number
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

// Um posto de trabalho: mesa (com sua posição/direção) + monitor
// (com ajuste fino próprio) + a cadeira do lado de FORA do pod (pra a
// pessoa olhar pra dentro, em direção ao corredor entre as duas
// duplas) + o agente que senta ali (usado por cena.ts pra colocar o
// retrato).
//
// Deslocamentos sempre em (Δcoluna, Δlinha) explícitos — não um único
// escalar — porque cadeira precisa de componente VERTICAL (aproximar/
// afastar da mesa) e HORIZONTAL (deslizar pro lado) ao mesmo tempo, e
// isso não dá pra fazer com um escalar só. Lembrete de sempre: mexer
// só em coluna OU só em linha anda na diagonal da tela; horizontal
// puro = (+k,-k), vertical puro = (+k,+k).
export interface Delta {
  coluna: number
  linha: number
}

export interface Posto {
  agenteId: string
  mesaPeca: string
  mesaDirecao: Direcao
  coluna: number
  linha: number
  deltaMonitor: Delta
  // âncora do teclado — o mouse sempre gruda do lado dele (ver
  // OFFSET_MOUSE), os dois viajam juntos como um par.
  deltaPerifericos: Delta
  cadeiraDirecao: Direcao
  deltaCadeira: Delta
}

function somar(a: Delta, ...resto: Delta[]): Delta {
  return resto.reduce((acc, d) => ({ coluna: acc.coluna + d.coluna, linha: acc.linha + d.linha }), a)
}

// vetores unitários "puros" de tela, em unidades de tile
const PARA_TRAS: Delta = { coluna: -1, linha: -1 } // pro fundo da sala (pura vertical)
const PARA_FRENTE: Delta = { coluna: 1, linha: 1 } // pra frente da sala (pura vertical)
const PARA_DIREITA: Delta = { coluna: 1, linha: -1 } // pura horizontal
const PARA_ESQUERDA: Delta = { coluna: -1, linha: 1 } // pura horizontal

function escala(d: Delta, k: number): Delta {
  return { coluna: d.coluna * k, linha: d.linha * k }
}

// Monitor: primeiro centralizado NA MESA (0,0), depois puxado pro
// fundo da sala. No Cifra/Agenda o recuo é maior E o teclado/mouse
// avança em direção ao agente — precisa de mais separação porque
// senão o par teclado+mouse fica "em cima" do monitor. No Vita/Norte
// o monitor só precisa recuar mais um pouco (estava perto demais);
// teclado/mouse ficam no centro da mesa mesmo, sem avançar.
const RECUO_MONITOR = escala(PARA_TRAS, 0.22)
const AVANCO_PERIFERICOS = escala(PARA_FRENTE, 0.16)
const CENTRO_MESA: Delta = { coluna: 0, linha: 0 }

// Deslocamento do mouse em relação à âncora do teclado — os dois
// sempre viajam juntos como um par, grudados um do lado do outro.
const OFFSET_MOUSE = escala(PARA_DIREITA, 0.13)

export const POSTOS: Posto[] = [
  {
    agenteId: 'cifra',
    mesaPeca: 'desk',
    mesaDirecao: 'NW',
    ...entre('D4', 'E4'),
    deltaMonitor: RECUO_MONITOR,
    deltaPerifericos: AVANCO_PERIFERICOS,
    cadeiraDirecao: 'SW',
    deltaCadeira: somar(escala(PARA_TRAS, 0.42), escala(PARA_DIREITA, 0.22)),
  },
  {
    agenteId: 'agenda',
    mesaPeca: 'desk',
    mesaDirecao: 'NW',
    ...entre('E4', 'F4'),
    deltaMonitor: RECUO_MONITOR,
    deltaPerifericos: AVANCO_PERIFERICOS,
    cadeiraDirecao: 'SW',
    deltaCadeira: somar(escala(PARA_TRAS, 0.42), escala(PARA_DIREITA, 0.22)),
  },
  {
    agenteId: 'vita',
    mesaPeca: 'desk',
    mesaDirecao: 'SW',
    ...entre('D5', 'E5'),
    deltaMonitor: RECUO_MONITOR,
    deltaPerifericos: CENTRO_MESA,
    cadeiraDirecao: 'NW',
    deltaCadeira: somar(escala(PARA_FRENTE, 0.42), escala(PARA_ESQUERDA, 0.32)),
  },
  {
    agenteId: 'norte',
    mesaPeca: 'desk',
    mesaDirecao: 'SW',
    ...entre('E5', 'F5'),
    deltaMonitor: RECUO_MONITOR,
    deltaPerifericos: CENTRO_MESA,
    cadeiraDirecao: 'NW',
    deltaCadeira: somar(escala(PARA_FRENTE, 0.42), escala(PARA_ESQUERDA, 0.32)),
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
      coluna: p.coluna + p.deltaMonitor.coluna,
      linha: p.linha + p.deltaMonitor.linha,
      altura: 0.16,
      desempate: 2,
      // profundidade fixada na mesa — o ajuste fino de posição não
      // pode fazer o monitor "recuar" pra trás da própria mesa
      zColuna: p.coluna,
      zLinha: p.linha,
    },
    // teclado e mouse: sempre juntos como um par (mouse gruda do lado
    // do teclado), os dois na âncora deltaPerifericos do posto
    {
      peca: 'computerKeyboard',
      direcao: p.mesaDirecao,
      coluna: p.coluna + p.deltaPerifericos.coluna,
      linha: p.linha + p.deltaPerifericos.linha,
      altura: 0.16,
      desempate: 3,
      zColuna: p.coluna,
      zLinha: p.linha,
    },
    {
      peca: 'computerMouse',
      direcao: p.mesaDirecao,
      coluna: p.coluna + p.deltaPerifericos.coluna + OFFSET_MOUSE.coluna,
      linha: p.linha + p.deltaPerifericos.linha + OFFSET_MOUSE.linha,
      altura: 0.16,
      desempate: 3,
      zColuna: p.coluna,
      zLinha: p.linha,
    },
    {
      peca: 'chairDesk',
      direcao: p.cadeiraDirecao,
      coluna: p.coluna + p.deltaCadeira.coluna,
      linha: p.linha + p.deltaCadeira.linha,
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
