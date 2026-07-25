import { Assets, Container, Graphics, Sprite, type Texture } from 'pixi.js'
import { paraTela, profundidade, TILE_W, TILE_H } from './iso'
import {
  COLUNAS,
  LINHAS,
  PALETA,
  ESPESSURA_LAJE,
  ALTURA_PAREDE,
  ESPESSURA_PAREDE,
  JANELA_BASE,
  JANELA_TOPO,
  caminhoSprite,
  type Direcao,
  type Janela,
} from './sala'
import { MOVEIS, TAPETES, ancoraDe, pecasUsadas } from './mobilia'

// Abordagem combinada:
//   - piso, laje e paredes são DESENHADOS (Graphics) → cor 100% livre,
//     nenhuma emenda entre tiles, e a laje grossa que dá o ar de maquete
//   - móveis são SPRITES do pack → arte de verdade
//
// O que faz os dois conversarem é a geometria: o piso é desenhado no
// mesmo ângulo dos sprites do Kenney (208x146, medido nos PNGs), então
// móvel e chão parecem estar sob a mesma câmera.
//
// Camadas, de trás pra frente:
//   paredes → laje → piso → tapetes → móveis (estes ordenados por
//   profundidade entre si).

async function carregarTexturas(): Promise<Map<string, Texture>> {
  const mapa = new Map<string, Texture>()
  await Promise.all(
    pecasUsadas().map(async ({ peca, direcao }: { peca: string; direcao: Direcao }) => {
      const chave = `${peca}_${direcao}`
      if (mapa.has(chave)) return
      mapa.set(chave, await Assets.load(caminhoSprite(peca, direcao)))
    }),
  )
  return mapa
}

// Os 4 cantos externos da planta. paraTela(c - 0.5, l - 0.5) devolve o
// vértice de cima do tile (c, l), então meio tile em cada eixo chega
// nas quinas do retângulo inteiro.
function cantos() {
  return {
    norte: paraTela(-0.5, -0.5),
    leste: paraTela(COLUNAS - 0.5, -0.5),
    sul: paraTela(COLUNAS - 0.5, LINHAS - 0.5),
    oeste: paraTela(-0.5, LINHAS - 0.5),
  }
}

function desenharLaje(): Graphics {
  const { leste, sul, oeste } = cantos()
  const g = new Graphics()

  g.poly([
    oeste.x, oeste.y,
    sul.x, sul.y,
    sul.x, sul.y + ESPESSURA_LAJE,
    oeste.x, oeste.y + ESPESSURA_LAJE,
  ])
  g.fill(PALETA.lajeFrente)

  g.poly([
    sul.x, sul.y,
    leste.x, leste.y,
    leste.x, leste.y + ESPESSURA_LAJE,
    sul.x, sul.y + ESPESSURA_LAJE,
  ])
  g.fill(PALETA.lajeLado)

  return g
}

function desenharPiso(): Graphics {
  const g = new Graphics()
  const hw = TILE_W / 2
  const hh = TILE_H / 2

  for (let linha = 0; linha < LINHAS; linha++) {
    for (let coluna = 0; coluna < COLUNAS; coluna++) {
      const { x, y } = paraTela(coluna, linha)
      g.poly([x, y - hh, x + hw, y, x, y + hh, x - hw, y])
      g.fill((coluna + linha) % 2 === 0 ? PALETA.pisoClaro : PALETA.pisoEscuro)
      g.stroke({ width: 1, color: PALETA.pisoJunta, alignment: 0.5 })
    }
  }

  return g
}

// Uma parede: corre da quina `de` até a quina `ate` (as duas na linha do
// piso) e sobe. Ganha uma faixa clara no topo (a espessura da parede
// vista de cima) e um rodapé mais escuro embaixo.
type Ponto2 = { x: number; y: number }

// Um ponto na FACE da parede, em coordenadas próprias dela:
//   t = 0..1 ao longo do comprimento (0 na quina do fundo)
//   h = 0..1 na altura (0 no chão, 1 no topo)
// Isso deixa desenhar janela/quadro na parede sem repetir trigonometria.
function naParede(de: Ponto2, ate: Ponto2, t: number, h: number): Ponto2 {
  return {
    x: de.x + (ate.x - de.x) * t,
    y: de.y + (ate.y - de.y) * t - h * ALTURA_PAREDE,
  }
}

function quadNaParede(
  g: Graphics,
  de: Ponto2,
  ate: Ponto2,
  t0: number,
  t1: number,
  h0: number,
  h1: number,
  cor: number,
) {
  const a = naParede(de, ate, t0, h1)
  const b = naParede(de, ate, t1, h1)
  const c = naParede(de, ate, t1, h0)
  const d = naParede(de, ate, t0, h0)
  g.poly([a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y])
  g.fill(cor)
}

function desenharJanela(g: Graphics, de: Ponto2, ate: Ponto2, janela: Janela) {
  const { inicio, fim, base, topo } = janela
  // moldura por fora, vidro por dentro
  quadNaParede(g, de, ate, inicio, fim, base, topo, PALETA.janelaMoldura)

  const margemT = (fim - inicio) * 0.12
  const margemH = (topo - base) * 0.1
  const vt0 = inicio + margemT
  const vt1 = fim - margemT
  const vh0 = base + margemH
  const vh1 = topo - margemH

  quadNaParede(g, de, ate, vt0, vt1, vh0, vh1, PALETA.janelaVidro)
  // brilho: a metade de cima do vidro mais clara, sugerindo luz entrando
  quadNaParede(g, de, ate, vt0, vt1, (vh0 + vh1) / 2, vh1, PALETA.janelaBrilho)
  // caixilho central, dividindo em duas folhas
  const meio = (vt0 + vt1) / 2
  const larguraCaixilho = (fim - inicio) * 0.035
  quadNaParede(g, de, ate, meio - larguraCaixilho, meio + larguraCaixilho, vh0, vh1, PALETA.janelaMoldura)
  // peitoril, uma faixa fina logo abaixo da janela
  quadNaParede(g, de, ate, inicio - margemT, fim + margemT, base - 0.035, base, PALETA.paredeTopo)
}

function desenharParede(de: Ponto2, ate: Ponto2, cor: number, janelas: Janela[]): Graphics {
  const g = new Graphics()
  const alturaRodape = 12

  g.poly([de.x, de.y, ate.x, ate.y, ate.x, ate.y - ALTURA_PAREDE, de.x, de.y - ALTURA_PAREDE])
  g.fill(cor)

  g.poly([de.x, de.y, ate.x, ate.y, ate.x, ate.y - alturaRodape, de.x, de.y - alturaRodape])
  g.fill(PALETA.rodape)

  for (const janela of janelas) desenharJanela(g, de, ate, janela)

  // topo da parede por último, pra cobrir qualquer sobra da janela e
  // fechar a espessura
  g.poly([
    de.x, de.y - ALTURA_PAREDE,
    ate.x, ate.y - ALTURA_PAREDE,
    ate.x, ate.y - ALTURA_PAREDE - ESPESSURA_PAREDE,
    de.x, de.y - ALTURA_PAREDE - ESPESSURA_PAREDE,
  ])
  g.fill(PALETA.paredeTopo)

  return g
}

export async function criarCena(): Promise<Container> {
  const texturas = await carregarTexturas()
  const pegar = (chave: string) => {
    const t = texturas.get(chave)
    if (!t) throw new Error(`textura não carregada: ${chave}`)
    return t
  }

  const cena = new Container()
  const camadaMoveis = new Container()
  camadaMoveis.sortableChildren = true

  const { norte, leste, oeste } = cantos()

  // UMA janela só por enquanto — exemplar pra aprovação antes de
  // espalhar pelas duas paredes.
  const janelaExemplo: Janela[] = [
    { inicio: 0.36, fim: 0.6, base: JANELA_BASE, topo: JANELA_TOPO },
  ]

  cena.addChild(
    desenharParede(norte, oeste, PALETA.paredeEsquerda, janelaExemplo),
    desenharParede(norte, leste, PALETA.paredeDireita, []),
    desenharLaje(),
    desenharPiso(),
  )

  // tapetes: no chão, acima do piso, abaixo de qualquer móvel
  for (const t of TAPETES) {
    const sprite = new Sprite(pegar(`${t.peca}_${t.direcao}`))
    const a = ancoraDe(t.peca)
    sprite.anchor.set(a.x, a.y)
    const { x, y } = paraTela(t.coluna, t.linha)
    sprite.x = x
    sprite.y = y
    cena.addChild(sprite)
  }

  cena.addChild(camadaMoveis)

  for (const m of MOVEIS) {
    const sprite = new Sprite(pegar(`${m.peca}_${m.direcao}`))
    const a = ancoraDe(m.peca)
    sprite.anchor.set(a.x, a.y)
    const { x, y } = paraTela(m.coluna, m.linha, m.altura ?? 0)
    sprite.x = x
    sprite.y = y
    sprite.zIndex = profundidade(m.coluna, m.linha) * 10 + (m.desempate ?? 0)
    camadaMoveis.addChild(sprite)
  }

  return cena
}
