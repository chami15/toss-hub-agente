import { Assets, Container, FillGradient, Graphics, Sprite, type Texture } from 'pixi.js'
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
import { MOVEIS, POSTOS, TAPETES, ancoraDe, pecasUsadas, RECORTES } from './mobilia'
import { AGENTES, PASTA_AGENTES } from './agentes'

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

async function carregarRetratos(): Promise<Map<string, Texture>> {
  const mapa = new Map<string, Texture>()
  await Promise.all(
    AGENTES.map(async (a) => {
      mapa.set(a.id, await Assets.load(`${PASTA_AGENTES}/${a.arquivo}`))
    }),
  )
  return mapa
}

// O "crachá" do agente: o retrato recortado em círculo (via mask do
// Pixi) + um anel na cor de identidade dele. O recorte usa o CENTRO do
// retrato calibrado em RECORTES como âncora do sprite — assim a
// escala coloca exatamente aquele ponto na posição pedida, e a mask
// (mesmo centro/raio, já em pixel de tela) recorta o círculo certo.
const DIAMETRO_CRACHA = 84
const ESPESSURA_ANEL = 5

function criarAvatar(retrato: Texture, recorte: { cx: number; cy: number; raio: number }, cor: number, x: number, y: number): Container {
  const container = new Container()
  const raioTela = DIAMETRO_CRACHA / 2

  const sprite = new Sprite(retrato)
  sprite.anchor.set(recorte.cx, recorte.cy)
  const escala = raioTela / (recorte.raio * retrato.width)
  sprite.scale.set(escala)
  sprite.x = x
  sprite.y = y

  const mascara = new Graphics()
  mascara.circle(x, y, raioTela).fill(0xffffff)
  sprite.mask = mascara

  const anel = new Graphics()
  anel.circle(x, y, raioTela + ESPESSURA_ANEL / 2)
  anel.stroke({ width: ESPESSURA_ANEL, color: cor })

  const sombra = new Graphics()
  sombra.circle(x, y + raioTela * 0.15, raioTela * 0.9)
  sombra.fill({ color: 0x000000, alpha: 0.18 })

  // a mask PRECISA estar na árvore de cena (senão a transform dela não
  // acompanha a câmera/zoom do container pai e o recorte desalinha) —
  // mas o Pixi não desenha normalmente um objeto que está sendo usado
  // como .mask de outro, então ela não aparece como um círculo branco.
  container.addChild(sombra, sprite, mascara, anel)
  return container
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

// Vidro com gradiente (céu) + um brilho diagonal, em vez de cor
// chapada — é a "textura" possível sem sair de Graphics: gradiente de
// verdade (FillGradient do Pixi) simulando profundidade/céu, mais uma
// faixa translúcida na diagonal simulando reflexo de vidro.
function desenharVidro(g: Graphics, de: Ponto2, ate: Ponto2, t0: number, t1: number, h0: number, h1: number) {
  const a = naParede(de, ate, t0, h1)
  const b = naParede(de, ate, t1, h1)
  const c = naParede(de, ate, t1, h0)
  const d = naParede(de, ate, t0, h0)

  const ceu = new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    textureSpace: 'local',
    colorStops: [
      { offset: 0, color: PALETA.janelaBrilho },
      { offset: 0.55, color: PALETA.janelaVidro },
      { offset: 1, color: PALETA.janelaVidroBase },
    ],
  })

  g.poly([a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y])
  g.fill(ceu)

  // reflexo: uma faixa clara e translúcida cruzando na diagonal
  const rt0 = t0 + (t1 - t0) * 0.08
  const rt1 = t0 + (t1 - t0) * 0.32
  const p1 = naParede(de, ate, rt0, h1)
  const p2 = naParede(de, ate, rt1, h1)
  const p3 = naParede(de, ate, rt1 - (t1 - t0) * 0.16, h0)
  const p4 = naParede(de, ate, rt0 - (t1 - t0) * 0.16, h0)
  g.poly([p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y])
  g.fill({ color: 0xffffff, alpha: 0.22 })
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

  desenharVidro(g, de, ate, vt0, vt1, vh0, vh1)

  // caixilho central, dividindo em duas folhas
  const meio = (vt0 + vt1) / 2
  const larguraCaixilho = (fim - inicio) * 0.035
  quadNaParede(g, de, ate, meio - larguraCaixilho, meio + larguraCaixilho, vh0, vh1, PALETA.janelaMoldura)
  // peitoril, uma faixa fina logo abaixo da janela
  quadNaParede(g, de, ate, inicio - margemT, fim + margemT, base - 0.035, base, PALETA.paredeTopo)
}

// Espessura lateral, vista na ponta externa da parede (a quina da
// sala). É o mesmo espírito da faixa de cima, só que na ponta: sem
// isso a parede parece uma folha de papel, sem volume nenhum na quina.
// Mesma proporção da faixa de cima — o vetor "fora" é normalizado pro
// comprimento de ESPESSURA_PAREDE, não uma fração arbitrária de tile.
function normalizarParaEspessura(v: Ponto2): Ponto2 {
  const comprimento = Math.hypot(v.x, v.y)
  const escala = ESPESSURA_PAREDE / comprimento
  return { x: v.x * escala, y: v.y * escala }
}

function desenharPontaLateral(g: Graphics, ponta: Ponto2, fora: Ponto2, cor: number) {
  const p2 = { x: ponta.x + fora.x, y: ponta.y + fora.y }

  g.poly([ponta.x, ponta.y, p2.x, p2.y, p2.x, p2.y - ALTURA_PAREDE, ponta.x, ponta.y - ALTURA_PAREDE])
  g.fill(cor)

  g.poly([
    ponta.x, ponta.y - ALTURA_PAREDE,
    p2.x, p2.y - ALTURA_PAREDE,
    p2.x, p2.y - ALTURA_PAREDE - ESPESSURA_PAREDE,
    ponta.x, ponta.y - ALTURA_PAREDE - ESPESSURA_PAREDE,
  ])
  g.fill(PALETA.paredeTopo)
}

function desenharParede(
  de: Ponto2,
  ate: Ponto2,
  cor: number,
  janelas: Janela[],
  foraNaPonta: Ponto2,
): Graphics {
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

  // espessura lateral, só na ponta externa (a ponta interna encosta na
  // outra parede e fica escondida)
  desenharPontaLateral(g, ate, foraNaPonta, cor)

  return g
}

export async function criarCena(): Promise<Container> {
  const [texturas, retratos] = await Promise.all([carregarTexturas(), carregarRetratos()])
  const pegar = (chave: string) => {
    const t = texturas.get(chave)
    if (!t) throw new Error(`textura não carregada: ${chave}`)
    return t
  }

  const cena = new Container()
  const camadaMoveis = new Container()
  camadaMoveis.sortableChildren = true

  const { norte, leste, oeste } = cantos()

  // aprovada — a mesma janela nas duas paredes, mesma posição relativa
  const janelaEsquerda: Janela[] = [
    { inicio: 0.36, fim: 0.6, base: JANELA_BASE, topo: JANELA_TOPO },
  ]
  const janelaDireita: Janela[] = [
    { inicio: 0.36, fim: 0.6, base: JANELA_BASE, topo: JANELA_TOPO },
  ]

  // vetores "pra fora" da sala, perpendiculares a cada parede — pra
  // fora é o oposto do eixo que a OUTRA parede percorre
  const foraEsquerda = normalizarParaEspessura({ x: -TILE_W / 2, y: -TILE_H / 2 })
  const foraDireita = normalizarParaEspessura({ x: TILE_W / 2, y: -TILE_H / 2 })

  cena.addChild(
    desenharParede(norte, oeste, PALETA.paredeEsquerda, janelaEsquerda, foraEsquerda),
    desenharParede(norte, leste, PALETA.paredeDireita, janelaDireita, foraDireita),
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
    sprite.zIndex = profundidade(m.zColuna ?? m.coluna, m.zLinha ?? m.linha) * 10 + (m.desempate ?? 0)
    camadaMoveis.addChild(sprite)
  }

  // crachá do agente: na posição da cadeira, "levantado" (altura) pra
  // ficar por cima do encosto, como se fosse a cabeça de quem senta ali
  const ALTURA_CRACHA = 0.62
  for (const posto of POSTOS) {
    const agente = AGENTES.find((a) => a.id === posto.agenteId)
    const retrato = retratos.get(posto.agenteId)
    const recorte = RECORTES[posto.agenteId]
    if (!agente || !retrato || !recorte) continue

    const colunaCadeira = posto.coluna + posto.deltaCadeira.coluna
    const linhaCadeira = posto.linha + posto.deltaCadeira.linha
    const { x, y } = paraTela(colunaCadeira, linhaCadeira, ALTURA_CRACHA)
    const avatar = criarAvatar(retrato, recorte, agente.cor, x, y)
    avatar.zIndex = profundidade(colunaCadeira, linhaCadeira) * 10 + 5
    camadaMoveis.addChild(avatar)
  }

  return cena
}
