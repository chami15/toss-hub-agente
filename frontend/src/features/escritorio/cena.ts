import { Assets, Container, Sprite, type Texture } from 'pixi.js'
import { paraTela, profundidade, TILE_W, TILE_H } from './iso'
import { COLUNAS, LINHAS, caminhoSprite, type Direcao } from './sala'
import { MOVEIS, TAPETES, ancoraDe, pecasUsadas } from './mobilia'

// Monta o cenário com os sprites do pack.
//
// A cena é dividida em CAMADAS, e isso é o que evita o bug clássico do
// isométrico: se piso e móvel disputassem o mesmo zIndex, um tile
// desenhado depois passaria por cima de um móvel que está atrás dele.
// Camadas resolvem isso de vez —
//   1. paredes do fundo  (sempre atrás de tudo)
//   2. piso
//   3. tapetes           (no chão, mas acima do piso)
//   4. móveis            (aqui sim ordenado por profundidade)

async function carregarTexturas(): Promise<Map<string, Texture>> {
  const alvos: { peca: string; direcao: Direcao }[] = [
    { peca: 'floorFull', direcao: 'NE' },
    { peca: 'wall', direcao: 'NE' },
    { peca: 'wall', direcao: 'NW' },
    { peca: 'wallWindow', direcao: 'NE' },
    { peca: 'wallWindow', direcao: 'NW' },
    ...pecasUsadas(),
  ]

  const mapa = new Map<string, Texture>()
  await Promise.all(
    alvos.map(async ({ peca, direcao }) => {
      const chave = `${peca}_${direcao}`
      if (mapa.has(chave)) return
      mapa.set(chave, await Assets.load(caminhoSprite(peca, direcao)))
    }),
  )
  return mapa
}

function novoSprite(textura: Texture, peca: string): Sprite {
  const sprite = new Sprite(textura)
  const ancora = ancoraDe(peca)
  sprite.anchor.set(ancora.x, ancora.y)
  return sprite
}

export async function criarCena(): Promise<Container> {
  const texturas = await carregarTexturas()
  const pegar = (chave: string) => {
    const t = texturas.get(chave)
    if (!t) throw new Error(`textura não carregada: ${chave}`)
    return t
  }

  const cena = new Container()
  const camadaParedes = new Container()
  const camadaPiso = new Container()
  const camadaTapetes = new Container()
  const camadaMoveis = new Container()
  camadaMoveis.sortableChildren = true
  cena.addChild(camadaParedes, camadaPiso, camadaTapetes, camadaMoveis)

  // --- paredes do fundo ---
  // A face da parede cobre exatamente uma aresta de tile. A aresta do
  // limite coluna=0 sobe pra direita (sprite _NE); a do limite linha=0
  // desce pra direita (sprite _NW). Cada peça é ancorada no meio da
  // própria base e posta no meio da aresta correspondente.
  const meia = { x: TILE_W / 4, y: TILE_H / 4 }

  for (let linha = 0; linha < LINHAS; linha++) {
    const centro = paraTela(0, linha)
    const peca = linha % 3 === 1 ? 'wallWindow' : 'wall'
    const sprite = novoSprite(pegar(`${peca}_NE`), peca)
    sprite.x = centro.x - meia.x
    sprite.y = centro.y - meia.y
    camadaParedes.addChild(sprite)
  }

  for (let coluna = 0; coluna < COLUNAS; coluna++) {
    const centro = paraTela(coluna, 0)
    const peca = coluna % 3 === 1 ? 'wallWindow' : 'wall'
    const sprite = novoSprite(pegar(`${peca}_NW`), peca)
    sprite.x = centro.x + meia.x
    sprite.y = centro.y - meia.y
    camadaParedes.addChild(sprite)
  }

  // --- piso ---
  // Ordem de pintura: do fundo pra frente, pra que a espessura da laje
  // de um tile fique escondida pelo tile da frente.
  const tiles: { coluna: number; linha: number }[] = []
  for (let linha = 0; linha < LINHAS; linha++) {
    for (let coluna = 0; coluna < COLUNAS; coluna++) tiles.push({ coluna, linha })
  }
  tiles.sort((a, b) => profundidade(a.coluna, a.linha) - profundidade(b.coluna, b.linha))
  for (const { coluna, linha } of tiles) {
    const sprite = novoSprite(pegar('floorFull_NE'), 'floorFull')
    const { x, y } = paraTela(coluna, linha)
    sprite.x = x
    sprite.y = y
    camadaPiso.addChild(sprite)
  }

  // --- tapetes ---
  for (const tapete of TAPETES) {
    const sprite = novoSprite(pegar(`${tapete.peca}_${tapete.direcao}`), tapete.peca)
    const { x, y } = paraTela(tapete.coluna, tapete.linha)
    sprite.x = x
    sprite.y = y
    camadaTapetes.addChild(sprite)
  }

  // --- móveis ---
  for (const movel of MOVEIS) {
    const sprite = novoSprite(pegar(`${movel.peca}_${movel.direcao}`), movel.peca)
    const { x, y } = paraTela(movel.coluna, movel.linha, movel.altura ?? 0)
    sprite.x = x
    sprite.y = y
    sprite.zIndex = profundidade(movel.coluna, movel.linha) * 10 + (movel.desempate ?? 0)
    camadaMoveis.addChild(sprite)
  }

  return cena
}
