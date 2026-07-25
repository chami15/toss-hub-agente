// Dados da sala — só dado, nenhum desenho. A planta é uma matriz de
// caracteres (mesma ideia do "heightmap" que o servidor Havana usa pro
// Habbo): cada caractere é um tile.
//
//   '.'  = piso normal
//   'x'  = fora da sala (buraco / não desenha nada ali)
//
// Trocar a planta = trocar essa string. Nenhum componente muda.

export const PLANTA = [
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
]

export interface Tile {
  coluna: number
  linha: number
}

export function tilesDaPlanta(planta: string[] = PLANTA): Tile[] {
  const tiles: Tile[] = []
  planta.forEach((linhaStr, linha) => {
    linhaStr.split('').forEach((caractere, coluna) => {
      if (caractere !== 'x') tiles.push({ coluna, linha })
    })
  })
  return tiles
}

export const TOTAL_COLUNAS = PLANTA[0].length
export const TOTAL_LINHAS = PLANTA.length

// Paleta do ambiente. Tons neutros de escritório; os sprites de móvel
// (Kenney) entram por cima disso.
export const PALETA = {
  fundo: 0x1b1d23,
  pisoClaro: 0xd8d2c6,
  pisoEscuro: 0xd0c9bc,
  pisoLinha: 0xbdb5a6,
  // a "espessura" da laje, que dá o ar de maquete vista de fora
  lajeLateral: 0x8c8577,
  lajeFrente: 0x9c9587,
  paredeEsquerda: 0xb9b2a4,
  paredeFundo: 0xc7c0b2,
  paredeTopo: 0xdad4c8,
  rodape: 0x8f887a,
}

// Espessura da laje do piso, em pixels.
export const ESPESSURA_LAJE = 14

// Altura da parede, em "andares" (unidades de TILE_ALTURA).
export const ALTURA_PAREDE = 3.2
