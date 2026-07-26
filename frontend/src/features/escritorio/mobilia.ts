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

// O que o modo de edição precisa saber sobre uma peça pra conseguir
// mexer nela e depois escrever o valor de volta no código:
//   origem — de onde o delta é medido (o centro da mesa do posto). Pras
//            mesas em si é (0,0), então o "delta" delas é a posição
//            absoluta no tabuleiro.
//   campo  — o nome do campo em Posto onde o valor vai ser colado
//            (deltaMonitor, deltaTeclado, ...). Sem campo = a peça não
//            mora num Posto (as mesas), e o editor emite coluna/linha.
export interface Edicao {
  id: string
  rotulo: string
  grupo: string
  origem: { coluna: number; linha: number }
  campo?: keyof Posto
}

export interface Movel {
  peca: string
  direcao: Direcao
  coluna: number
  linha: number
  altura?: number
  desempate?: number
  edicao?: Edicao
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

// Cada peça do posto tem seu delta PRÓPRIO e explícito, medido do
// centro da mesa. Antes eram derivados uns dos outros (o teclado saía
// do monitor, o mouse saía do teclado, o monitor saía de um "rumo a
// tal casa") — o que era esperto no papel e virou fonte de bug: mexer
// numa peça arrastava as outras junto, e ninguém conseguia prever o
// resultado. Agora cada uma é independente, e é isso que deixa o modo
// de edição (tecla E) escrever de volta valor por valor.
export interface Posto {
  agenteId: string
  mesaPeca: string
  mesaDirecao: Direcao
  coluna: number
  linha: number
  deltaMonitor: Delta
  deltaTeclado: Delta
  deltaMouse: Delta
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

export const CENTRO_MESA: Delta = { coluna: 0, linha: 0 }

// Deslocamento do mouse em relação à âncora do teclado — os dois
// sempre viajam juntos como um par, grudados um do lado do outro.
const OFFSET_MOUSE = escala(PARA_DIREITA, 0.13)

// Cifra/Agenda — reset: em vez de compor direções na mão (o que deu
// bug redondo passado), aponta direto pro ponto que o chefe indicou —
// "vai em direção a E5" — a partir do centro de CADA mesa. Como as
// mesas partem de lugares diferentes (D4-E4 vs E4-F4), o mesmo alvo
// E5 dá uma composição de direção diferente pra cada uma, e é assim
// mesmo que tem que ser (apontar o alvo, não o vetor).
const ORIGEM_CIFRA = entre('D4', 'E4')
const ORIGEM_AGENDA = entre('E4', 'F4')
const MONITOR_CIFRA = rumoA(ORIGEM_CIFRA, 'E5', 0.4)
const MONITOR_AGENDA = rumoA(ORIGEM_AGENDA, 'E5', 0.4)
// teclado/mouse: "bem na frente do monitor" — mais um empurrão pra
// frente a partir da posição do monitor, não do centro da mesa.
const PERIFERICOS_CIFRA = somar(MONITOR_CIFRA, escala(PARA_FRENTE, 0.15))
const PERIFERICOS_AGENDA = somar(MONITOR_AGENDA, escala(PARA_FRENTE, 0.15))

// Vita/Norte — só o monitor muda: continua onde estava (recuo +
// direita, já validado), só que agora também "indo em direção a"
// D6-E6 (Vita) / E6-F6 (Norte) — a casa de baixo da própria mesa.
// Teclado e mouse ficam exatamente como estavam.
const ORIGEM_VITA = entre('D5', 'E5')
const ORIGEM_NORTE = entre('E5', 'F5')
const AJUSTE_VITA = rumoAPonto(ORIGEM_VITA, entre('D6', 'E6'), 0.35)
const AJUSTE_NORTE = rumoAPonto(ORIGEM_NORTE, entre('E6', 'F6'), 0.35)
const MONITOR_VITA = somar(RECUO_MONITOR, escala(PARA_DIREITA, 0.12), AJUSTE_VITA)
const MONITOR_NORTE = somar(RECUO_MONITOR, escala(PARA_DIREITA, 0.12), AJUSTE_NORTE)
const MOUSE_EXTRA_VITA_NORTE = escala(PARA_FRENTE, 0.1)

export const POSTOS: Posto[] = [
  {
    agenteId: 'cifra',
    mesaPeca: 'desk',
    mesaDirecao: 'NW',
    ...entre('D4', 'E4'),
    deltaMonitor: somar(escala(PARA_FRENTE, 0.3), escala(PARA_ESQUERDA, 0.1)),
    deltaTeclado: somar(escala(PARA_FRENTE, 0.45), escala(PARA_ESQUERDA, 0.1)),
    deltaMouse: somar(escala(PARA_FRENTE, 0.45), escala(PARA_DIREITA, 0.03)),
    cadeiraDirecao: 'SW',
    deltaCadeira: somar(escala(PARA_TRAS, 0.42), escala(PARA_DIREITA, 0.22)),
  },
  {
    agenteId: 'agenda',
    mesaPeca: 'desk',
    mesaDirecao: 'NW',
    ...entre('E4', 'F4'),
    deltaMonitor: somar(escala(PARA_FRENTE, 0.1), escala(PARA_ESQUERDA, 0.3)),
    deltaTeclado: somar(escala(PARA_FRENTE, 0.25), escala(PARA_ESQUERDA, 0.3)),
    deltaMouse: somar(escala(PARA_FRENTE, 0.25), escala(PARA_ESQUERDA, 0.17)),
    cadeiraDirecao: 'SW',
    deltaCadeira: somar(escala(PARA_TRAS, 0.42), escala(PARA_DIREITA, 0.22)),
  },
  {
    agenteId: 'vita',
    mesaPeca: 'desk',
    mesaDirecao: 'SW',
    ...entre('D5', 'E5'),
    deltaMonitor: somar(escala(PARA_TRAS, 0.045), escala(PARA_ESQUERDA, 0.055)),
    deltaTeclado: CENTRO_MESA,
    deltaMouse: somar(escala(PARA_FRENTE, 0.1), escala(PARA_DIREITA, 0.13)),
    cadeiraDirecao: 'NW',
    deltaCadeira: somar(escala(PARA_FRENTE, 0.42), escala(PARA_ESQUERDA, 0.32)),
  },
  {
    agenteId: 'norte',
    mesaPeca: 'desk',
    mesaDirecao: 'SW',
    ...entre('E5', 'F5'),
    deltaMonitor: somar(escala(PARA_TRAS, 0.045), escala(PARA_ESQUERDA, 0.055)),
    deltaTeclado: CENTRO_MESA,
    deltaMouse: somar(escala(PARA_FRENTE, 0.1), escala(PARA_DIREITA, 0.13)),
    cadeiraDirecao: 'NW',
    deltaCadeira: somar(escala(PARA_FRENTE, 0.42), escala(PARA_ESQUERDA, 0.32)),
  },
]

const SEM_ORIGEM = { coluna: 0, linha: 0 }

function nomeDe(agenteId: string): string {
  return agenteId.charAt(0).toUpperCase() + agenteId.slice(1)
}

export const MOVEIS: Movel[] = [
  // mesa do chefe — B2, virada NE (sem avatar por enquanto)
  {
    peca: 'deskCorner',
    direcao: 'NE',
    ...casa('B2'),
    edicao: { id: 'chefe:mesa', rotulo: 'Mesa · Chefe', grupo: 'chefe', origem: SEM_ORIGEM },
  },

  ...POSTOS.flatMap((p): Movel[] => {
    const nome = nomeDe(p.agenteId)
    // as peças de cima da mesa medem o delta a partir do centro dela
    const origem = { coluna: p.coluna, linha: p.linha }
    // profundidade fixada na mesa — o ajuste fino de posição (ou um
    // arrasto no modo de edição) não pode fazer a peça "recuar" pra
    // trás da própria mesa e sumir
    const zDaMesa = { zColuna: p.coluna, zLinha: p.linha }

    return [
      {
        peca: p.mesaPeca,
        direcao: p.mesaDirecao,
        coluna: p.coluna,
        linha: p.linha,
        edicao: {
          id: `${p.agenteId}:mesa`,
          rotulo: `Mesa · ${nome}`,
          grupo: p.agenteId,
          origem: SEM_ORIGEM,
        },
      },
      {
        peca: 'computerScreen',
        direcao: p.mesaDirecao,
        coluna: p.coluna + p.deltaMonitor.coluna,
        linha: p.linha + p.deltaMonitor.linha,
        altura: 0.16,
        desempate: 2,
        ...zDaMesa,
        edicao: {
          id: `${p.agenteId}:monitor`,
          rotulo: `Monitor · ${nome}`,
          grupo: p.agenteId,
          origem,
          campo: 'deltaMonitor',
        },
      },
      {
        peca: 'computerKeyboard',
        direcao: p.mesaDirecao,
        coluna: p.coluna + p.deltaTeclado.coluna,
        linha: p.linha + p.deltaTeclado.linha,
        altura: 0.16,
        desempate: 3,
        ...zDaMesa,
        edicao: {
          id: `${p.agenteId}:teclado`,
          rotulo: `Teclado · ${nome}`,
          grupo: p.agenteId,
          origem,
          campo: 'deltaTeclado',
        },
      },
      {
        peca: 'computerMouse',
        direcao: p.mesaDirecao,
        coluna: p.coluna + p.deltaMouse.coluna,
        linha: p.linha + p.deltaMouse.linha,
        altura: 0.16,
        desempate: 3,
        ...zDaMesa,
        edicao: {
          id: `${p.agenteId}:mouse`,
          rotulo: `Mouse · ${nome}`,
          grupo: p.agenteId,
          origem,
          campo: 'deltaMouse',
        },
      },
      {
        peca: 'chairDesk',
        direcao: p.cadeiraDirecao,
        coluna: p.coluna + p.deltaCadeira.coluna,
        linha: p.linha + p.deltaCadeira.linha,
        desempate: 4,
        edicao: {
          id: `${p.agenteId}:cadeira`,
          rotulo: `Cadeira · ${nome}`,
          grupo: p.agenteId,
          origem,
          campo: 'deltaCadeira',
        },
      },
    ]
  }),
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
