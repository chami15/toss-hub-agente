import { Assets, Container, Graphics, Sprite, type Texture } from 'pixi.js'
import { paraTela, profundidade, TILE_W, TILE_H } from './iso'
import {
  COLUNAS,
  LINHAS,
  PALETA,
  ESPESSURA_LAJE,
  ALTURA_PAREDE,
  caminhoSprite,
  type Direcao,
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
function desenharParede(
  de: { x: number; y: number },
  ate: { x: number; y: number },
  cor: number,
): Graphics {
  const g = new Graphics()
  const espessuraTopo = 10
  const alturaRodape = 12

  g.poly([de.x, de.y, ate.x, ate.y, ate.x, ate.y - ALTURA_PAREDE, de.x, de.y - ALTURA_PAREDE])
  g.fill(cor)

  g.poly([
    de.x, de.y - ALTURA_PAREDE,
    ate.x, ate.y - ALTURA_PAREDE,
    ate.x, ate.y - ALTURA_PAREDE - espessuraTopo,
    de.x, de.y - ALTURA_PAREDE - espessuraTopo,
  ])
  g.fill(PALETA.paredeTopo)

  g.poly([de.x, de.y, ate.x, ate.y, ate.x, ate.y - alturaRodape, de.x, de.y - alturaRodape])
  g.fill(PALETA.rodape)

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
  cena.addChild(
    desenharParede(norte, oeste, PALETA.paredeEsquerda),
    desenharParede(norte, leste, PALETA.paredeDireita),
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
