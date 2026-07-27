// Dados e paleta da sala — só dado, nenhum desenho.
//
// Tamanho e cor não são mais constantes globais: cada sala manda no
// próprio `colunas`/`linhas`/`paleta` (ver SalaDados em sala-dados.ts).
// Antes eram fixos aqui e o JSON da sala tinha campos com esse nome
// que nada lia — uma sala 10×6 teria dado dizendo 10×6 e piso
// desenhado 7×7, com móvel pendurado no vazio.

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
  janelaMoldura: number
  janelaVidro: number
  janelaVidroBase: number
  janelaBrilho: number
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
    janelaMoldura: 0xf0ece4,
    janelaVidro: 0x9fc4d6,
    janelaVidroBase: 0x6f9fb8,
    janelaBrilho: 0xd6eaf3,
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
    janelaMoldura: 0xf4f0e9,
    janelaVidro: 0x9fc4d6,
    janelaVidroBase: 0x6f9fb8,
    janelaBrilho: 0xd9ecf5,
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
    janelaMoldura: 0xeef1f4,
    janelaVidro: 0x9cc3d8,
    janelaVidroBase: 0x6c9db3,
    janelaBrilho: 0xd5eaf5,
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
    janelaMoldura: 0xf3efe3,
    janelaVidro: 0xa3c6d4,
    janelaVidroBase: 0x729fb0,
    janelaBrilho: 0xdaecf2,
  },
}

// ---------------------------------------------------------------
// Gerar uma paleta a partir de UMA cor — pro formulário "criar sala".
//
// Um formulário com um seletor pra cada um dos 14 tons seria pesado, e
// a maior parte das combinações ficaria feia. Em vez disso o chefe
// escolhe uma cor (a do piso claro, que é o tom mais visível da sala)
// e o resto é derivado por HSL: mesmo matiz, variando saturação e
// luminosidade. Os deltas abaixo saem de MEDIR a paleta "neutra"
// existente (mesma técnica das âncoras: medir o que já funciona, não
// chutar) — piso→laje→parede→rodapé ficam na mesma relação de
// escurecimento que a paleta feita à mão.
function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

function clampIntervalo(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function hexParaHsl(hex: number): { h: number; s: number; l: number } {
  const r = ((hex >> 16) & 255) / 255
  const g = ((hex >> 8) & 255) / 255
  const b = (hex & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0)
      break
    case g:
      h = (b - r) / d + 2
      break
    default:
      h = (r - g) / d + 4
  }
  return { h: (h / 6) * 360, s, l }
}

export function hslParaHex(h: number, s: number, l: number): number {
  const hh = (((h % 360) + 360) % 360) / 360
  s = clamp01(s)
  l = clamp01(l)

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, hh + 1 / 3)
    g = hue2rgb(p, q, hh)
    b = hue2rgb(p, q, hh - 1 / 3)
  }
  const to255 = (v: number) => Math.round(clamp01(v) * 255)
  return (to255(r) << 16) | (to255(g) << 8) | to255(b)
}

// vidro sempre num azul de céu, independente da cor da sala — é
// reflexo do céu, não da parede
const JANELA_FIXA = { vidro: 0x9fc4d6, vidroBase: 0x6f9fb8, brilho: 0xd8ecf4 }

export function gerarPaletaDeCor(nome: string, corBase: number): Paleta {
  const { h, s } = hexParaHsl(corBase)
  // limites de qualidade: uma cor quase preta, quase branca ou neon
  // pura ainda vira uma sala jogável, não uma tela quebrada
  const sat = clampIntervalo(s, 0.08, 0.65)
  const { l: lBruto } = hexParaHsl(corBase)
  const l = clampIntervalo(lBruto, 0.4, 0.85)

  const tom = (dl: number, ds = 0) => hslParaHex(h, sat + ds, l + dl)

  return {
    nome,
    vazio: hslParaHex(h + 180, sat * 0.7, 0.11),
    pisoClaro: hslParaHex(h, sat, l),
    pisoEscuro: tom(-0.035, -0.012),
    pisoJunta: tom(-0.116, -0.039),
    lajeFrente: tom(-0.241, -0.092),
    lajeLado: tom(-0.304, -0.104),
    paredeEsquerda: tom(-0.073, -0.03),
    paredeDireita: tom(-0.127, -0.057),
    paredeTopo: tom(0.008, 0.008),
    rodape: tom(-0.292, -0.102),
    janelaMoldura: tom(0.106, 0.098),
    janelaVidro: JANELA_FIXA.vidro,
    janelaVidroBase: JANELA_FIXA.vidroBase,
    janelaBrilho: JANELA_FIXA.brilho,
  }
}

// Espessura da laje do piso, em pixels — é o que dá o volume de maquete.
export const ESPESSURA_LAJE = 22

// Altura da face da parede, em pixels. Casada com a altura da parede do
// pack (`wall_NE.png` tem 137px de face), pra ficar coerente com a
// escala dos móveis.
export const ALTURA_PAREDE = 150

// Espessura da parede (a faixa clara vista de cima, no topo dela) — o
// mesmo truque da laje, só que na vertical: é o que tira o ar de
// "papelão recortado" e dá volume de maquete.
export const ESPESSURA_PAREDE = 24

// Onde ficam as janelas em cada parede, como fração do comprimento
// (0 = quina do fundo, 1 = ponta da parede) e altura como fração da
// altura da parede.
export interface Janela {
  inicio: number
  fim: number
  base: number
  topo: number
}

export const JANELA_BASE = 0.34
export const JANELA_TOPO = 0.78

// ---------------------------------------------------------------

export const PASTA_SPRITES = '/Isometric'

export type Direcao = 'NE' | 'NW' | 'SE' | 'SW'

export function caminhoSprite(peca: string, direcao: Direcao): string {
  return `${PASTA_SPRITES}/${peca}_${direcao}.png`
}
