// Dados e paleta da sala — só dado, nenhum desenho.

export const COLUNAS = 7
export const LINHAS = 7

// ---------------------------------------------------------------
// PALETA — é aqui que se muda a cor do ambiente inteiro.
// Piso e paredes são DESENHADOS (não são sprite), justamente pra essa
// cor ser livre. Os móveis continuam sendo a arte do pack.
// ---------------------------------------------------------------
export interface Paleta {
  nome: string
  vazio: number // o fundo atrás da maquete
  pisoClaro: number
  pisoEscuro: number
  pisoJunta: number
  lajeFrente: number
  lajeLado: number
  paredeEsquerda: number
  paredeDireita: number
  paredeTopo: number
  rodape: number
}

export const PALETAS: Record<string, Paleta> = {
  // o cinza-areia neutro da primeira versão
  neutra: {
    nome: 'neutra',
    vazio: 0x1b1d23,
    pisoClaro: 0xd8d2c6,
    pisoEscuro: 0xd0c9bc,
    pisoJunta: 0xbdb5a6,
    lajeFrente: 0x9c9587,
    lajeLado: 0x8c8577,
    paredeEsquerda: 0xc7c0b2,
    paredeDireita: 0xb9b2a4,
    paredeTopo: 0xdad4c8,
    rodape: 0x8f887a,
  },
  // madeira clara + parede clara, ar de escritório moderno
  madeira: {
    nome: 'madeira',
    vazio: 0x181a1f,
    pisoClaro: 0xc9a577,
    pisoEscuro: 0xbf9a6c,
    pisoJunta: 0xa8834f,
    lajeFrente: 0x8a6a44,
    lajeLado: 0x795c3a,
    paredeEsquerda: 0xe8e3da,
    paredeDireita: 0xdad4c9,
    paredeTopo: 0xf2eee7,
    rodape: 0xa89f92,
  },
  // carpete cinza-azulado corporativo
  corporativa: {
    nome: 'corporativa',
    vazio: 0x14161b,
    pisoClaro: 0x8d959d,
    pisoEscuro: 0x848c94,
    pisoJunta: 0x717981,
    lajeFrente: 0x5c646c,
    lajeLado: 0x4f575e,
    paredeEsquerda: 0xd7dbe0,
    paredeDireita: 0xc7ccd2,
    paredeTopo: 0xe6e9ed,
    rodape: 0x8b9299,
  },
  // verde-oliva quente, ar mais acolhedor
  oliva: {
    nome: 'oliva',
    vazio: 0x16181c,
    pisoClaro: 0x9aa07a,
    pisoEscuro: 0x91976f,
    pisoJunta: 0x7b815b,
    lajeFrente: 0x63684a,
    lajeLado: 0x555940,
    paredeEsquerda: 0xe7e2d3,
    paredeDireita: 0xd8d3c3,
    paredeTopo: 0xf1ede1,
    rodape: 0x8d8a76,
  },
}

// Troque aqui pra mudar o ambiente inteiro.
export const PALETA: Paleta = PALETAS.neutra

// Espessura da laje do piso, em pixels — é o que dá o volume de maquete.
export const ESPESSURA_LAJE = 22

// Altura da face da parede, em pixels. Casada com a altura da parede do
// pack (`wall_NE.png` tem 137px de face), pra ficar coerente com a
// escala dos móveis.
export const ALTURA_PAREDE = 150

// ---------------------------------------------------------------

export const PASTA_SPRITES = '/Isometric'

export type Direcao = 'NE' | 'NW' | 'SE' | 'SW'

export function caminhoSprite(peca: string, direcao: Direcao): string {
  return `${PASTA_SPRITES}/${peca}_${direcao}.png`
}
