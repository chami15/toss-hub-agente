import { Assets, Container, FillGradient, Graphics, Sprite, Ticker, type Texture } from 'pixi.js'
import { paraTela, TILE_W, TILE_H } from './iso'
import {
  ESPESSURA_LAJE,
  ALTURA_PAREDE,
  ESPESSURA_PAREDE,
  JANELA_BASE,
  JANELA_TOPO,
  PALETAS,
  type Janela,
  type Paleta,
} from './sala'
import { AGENTES, PASTA_AGENTES, RECORTES } from './agentes'
import { Maquete } from './maquete'
import { conferirSala, type SalaDados } from './sala-dados'
import { CHAVES_PALETA } from './sala-conferir'
import type { EstadoAgente } from '../../types/agente'

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

// Estado vivo do agente (idle/falando/pensando/executando) — antes o
// anel era só a cor de identidade, parada, sem ligação nenhuma com
// `agentes.estado` (GET /agentes). Redesenho "Console": cada estado
// ganha uma linguagem de movimento PRÓPRIA, pra dar pra "sentir" o
// escritório funcionando sem abrir painel nenhum:
//   idle       — anel parado, como sempre foi.
//   falando    — glow pulsando (mesmo "ar de online" do HUD).
//   pensando   — anel pontilhado + o MESMO pulso de falando (só o
//                traço muda; girar era o design original mas confundia
//                com "executando" — decisão do chefe).
//   executando — anel sólido parado + um traço curto ORBITANDO em
//                volta, linguagem de movimento diferente de "pulsar",
//                pra nunca ser confundido com "falando".
interface ControladorAnel {
  definirEstado(estado: EstadoAgente): void
  animar(deltaMS: number, tempoTotalMS: number): void
}

const DURACAO_PULSO_MS = 2400
const VELOCIDADE_COMETA = 0.0035 // rad/ms
const LARGURA_COMETA = Math.PI * 2 * 0.1

// Mistura uma cor 0xRRGGBB com branco — é o que faz o cometa "acender"
// de verdade em cima do anel de base da MESMA cor; sem isto, o traço
// que gira fica invisível por cima do próprio anel (mesma cor, mesma
// espessura, mesmo lugar — nada pra diferenciar visualmente).
function clarear(cor: number, quantidade: number): number {
  const r = (cor >> 16) & 0xff
  const g = (cor >> 8) & 0xff
  const b = cor & 0xff
  const misturar = (canal: number) => Math.round(canal + (255 - canal) * quantidade)
  return (misturar(r) << 16) | (misturar(g) << 8) | misturar(b)
}

function criarAnelAnimado(cor: number, raioTela: number): { grafico: Container; controlador: ControladorAnel } {
  const raioAnel = raioTela + ESPESSURA_ANEL / 2
  const corCometa = clarear(cor, 0.65)
  const anelBase = new Graphics()
  const halo = new Graphics()
  const cometa = new Graphics()

  let estadoAtual: EstadoAgente = 'idle'
  let anguloCometa = 0

  function desenharAnelBase(pontilhado: boolean) {
    anelBase.clear()
    if (!pontilhado) {
      anelBase.circle(0, 0, raioAnel)
      anelBase.stroke({ width: ESPESSURA_ANEL, color: cor })
      return
    }
    // pontilhado: poucos traços LARGOS com vão bem visível — muitos
    // traços finos somem no anti-aliasing na escala que o crachá
    // aparece na tela (a maquete inteira cabe numa janela só)
    const TRACOS = 6
    for (let i = 0; i < TRACOS; i++) {
      const a0 = (i / TRACOS) * Math.PI * 2
      const a1 = a0 + ((Math.PI * 2) / TRACOS) * 0.6
      anelBase.arc(0, 0, raioAnel, a0, a1)
    }
    anelBase.stroke({ width: ESPESSURA_ANEL, color: cor })
  }

  // traço curto e BRILHANTE (cor clareada, mais grosso que o anel)
  // orbitando — precisa se destacar do anel de base, não só girar
  function desenharCometa() {
    cometa.clear()
    cometa.arc(0, 0, raioAnel, anguloCometa, anguloCometa + LARGURA_COMETA)
    cometa.stroke({ width: ESPESSURA_ANEL + 2, color: corCometa, cap: 'round' })
  }

  desenharAnelBase(false)
  halo.circle(0, 0, raioAnel + 5)
  // sem alpha aqui — quem controla o alpha é `animar()`, no objeto
  // (container.alpha), não no traçado; dar alpha nos dois multiplica
  // e o pulso vinha saindo bem mais apagado do que o previsto
  halo.stroke({ width: 4, color: cor })
  halo.visible = false
  desenharCometa()
  cometa.visible = false

  function definirEstado(estado: EstadoAgente) {
    if (estado === estadoAtual) return
    estadoAtual = estado
    desenharAnelBase(estado === 'pensando')
    halo.visible = estado === 'falando' || estado === 'pensando'
    cometa.visible = estado === 'executando'
  }

  function animar(_deltaMS: number, tempoTotalMS: number) {
    if (halo.visible) {
      const fase = (tempoTotalMS % DURACAO_PULSO_MS) / DURACAO_PULSO_MS
      halo.alpha = 0.25 + 0.65 * (0.5 - 0.5 * Math.cos(fase * Math.PI * 2))
    }
    if (cometa.visible) {
      anguloCometa += _deltaMS * VELOCIDADE_COMETA
      desenharCometa()
    }
  }

  const grupo = new Container()
  grupo.addChild(halo, anelBase, cometa)
  return { grafico: grupo, controlador: { definirEstado, animar } }
}

// Desenha tudo na ORIGEM do container — quem posiciona é o chamador,
// via container.x/y. Assim o crachá pode acompanhar a cadeira quando
// ela é arrastada no modo de edição (se as formas fossem desenhadas
// já nas coordenadas finais, mover o container somaria duas vezes).
function criarAvatar(
  retrato: Texture,
  recorte: { cx: number; cy: number; raio: number },
  cor: number,
): { container: Container; controlador: ControladorAnel } {
  const container = new Container()
  const raioTela = DIAMETRO_CRACHA / 2

  const sprite = new Sprite(retrato)
  sprite.anchor.set(recorte.cx, recorte.cy)
  const escala = raioTela / (recorte.raio * retrato.width)
  sprite.scale.set(escala)

  const mascara = new Graphics()
  mascara.circle(0, 0, raioTela).fill(0xffffff)
  sprite.mask = mascara

  const { grafico: anel, controlador } = criarAnelAnimado(cor, raioTela)

  const sombra = new Graphics()
  sombra.circle(0, raioTela * 0.15, raioTela * 0.9)
  sombra.fill({ color: 0x000000, alpha: 0.18 })

  // a mask PRECISA estar na árvore de cena (senão a transform dela não
  // acompanha a câmera/zoom do container pai e o recorte desalinha) —
  // mas o Pixi não desenha normalmente um objeto que está sendo usado
  // como .mask de outro, então ela não aparece como um círculo branco.
  container.addChild(sombra, sprite, mascara, anel)
  return { container, controlador }
}

// Os 4 cantos externos da planta. paraTela(c - 0.5, l - 0.5) devolve o
// vértice de cima do tile (c, l), então meio tile em cada eixo chega
// nas quinas do retângulo inteiro.
function cantos(colunas: number, linhas: number) {
  return {
    norte: paraTela(-0.5, -0.5),
    leste: paraTela(colunas - 0.5, -0.5),
    sul: paraTela(colunas - 0.5, linhas - 0.5),
    oeste: paraTela(-0.5, linhas - 0.5),
  }
}

function desenharLaje(colunas: number, linhas: number, paleta: Paleta): Graphics {
  const { leste, sul, oeste } = cantos(colunas, linhas)
  const g = new Graphics()

  g.poly([
    oeste.x, oeste.y,
    sul.x, sul.y,
    sul.x, sul.y + ESPESSURA_LAJE,
    oeste.x, oeste.y + ESPESSURA_LAJE,
  ])
  g.fill(paleta.lajeFrente)

  g.poly([
    sul.x, sul.y,
    leste.x, leste.y,
    leste.x, leste.y + ESPESSURA_LAJE,
    sul.x, sul.y + ESPESSURA_LAJE,
  ])
  g.fill(paleta.lajeLado)

  return g
}

function desenharPiso(colunas: number, linhas: number, paleta: Paleta): Graphics {
  const g = new Graphics()
  const hw = TILE_W / 2
  const hh = TILE_H / 2

  for (let linha = 0; linha < linhas; linha++) {
    for (let coluna = 0; coluna < colunas; coluna++) {
      const { x, y } = paraTela(coluna, linha)
      g.poly([x, y - hh, x + hw, y, x, y + hh, x - hw, y])
      g.fill((coluna + linha) % 2 === 0 ? paleta.pisoClaro : paleta.pisoEscuro)
      g.stroke({ width: 1, color: paleta.pisoJunta, alignment: 0.5 })
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
function desenharVidro(
  g: Graphics,
  de: Ponto2,
  ate: Ponto2,
  t0: number,
  t1: number,
  h0: number,
  h1: number,
  paleta: Paleta,
) {
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
      { offset: 0, color: paleta.janelaBrilho },
      { offset: 0.55, color: paleta.janelaVidro },
      { offset: 1, color: paleta.janelaVidroBase },
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

function desenharJanela(g: Graphics, de: Ponto2, ate: Ponto2, janela: Janela, paleta: Paleta) {
  const { inicio, fim, base, topo } = janela
  // moldura por fora, vidro por dentro
  quadNaParede(g, de, ate, inicio, fim, base, topo, paleta.janelaMoldura)

  const margemT = (fim - inicio) * 0.12
  const margemH = (topo - base) * 0.1
  const vt0 = inicio + margemT
  const vt1 = fim - margemT
  const vh0 = base + margemH
  const vh1 = topo - margemH

  desenharVidro(g, de, ate, vt0, vt1, vh0, vh1, paleta)

  // caixilho central, dividindo em duas folhas
  const meio = (vt0 + vt1) / 2
  const larguraCaixilho = (fim - inicio) * 0.035
  quadNaParede(g, de, ate, meio - larguraCaixilho, meio + larguraCaixilho, vh0, vh1, paleta.janelaMoldura)
  // peitoril, uma faixa fina logo abaixo da janela
  quadNaParede(g, de, ate, inicio - margemT, fim + margemT, base - 0.035, base, paleta.paredeTopo)
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

function desenharPontaLateral(g: Graphics, ponta: Ponto2, fora: Ponto2, cor: number, paleta: Paleta) {
  const p2 = { x: ponta.x + fora.x, y: ponta.y + fora.y }

  g.poly([ponta.x, ponta.y, p2.x, p2.y, p2.x, p2.y - ALTURA_PAREDE, ponta.x, ponta.y - ALTURA_PAREDE])
  g.fill(cor)

  g.poly([
    ponta.x, ponta.y - ALTURA_PAREDE,
    p2.x, p2.y - ALTURA_PAREDE,
    p2.x, p2.y - ALTURA_PAREDE - ESPESSURA_PAREDE,
    ponta.x, ponta.y - ALTURA_PAREDE - ESPESSURA_PAREDE,
  ])
  g.fill(paleta.paredeTopo)
}

function desenharParede(
  de: Ponto2,
  ate: Ponto2,
  cor: number,
  janelas: Janela[],
  foraNaPonta: Ponto2,
  paleta: Paleta,
): Graphics {
  const g = new Graphics()
  const alturaRodape = 12

  g.poly([de.x, de.y, ate.x, ate.y, ate.x, ate.y - ALTURA_PAREDE, de.x, de.y - ALTURA_PAREDE])
  g.fill(cor)

  g.poly([de.x, de.y, ate.x, ate.y, ate.x, ate.y - alturaRodape, de.x, de.y - alturaRodape])
  g.fill(paleta.rodape)

  for (const janela of janelas) desenharJanela(g, de, ate, janela, paleta)

  // topo da parede por último, pra cobrir qualquer sobra da janela e
  // fechar a espessura
  g.poly([
    de.x, de.y - ALTURA_PAREDE,
    ate.x, ate.y - ALTURA_PAREDE,
    ate.x, ate.y - ALTURA_PAREDE - ESPESSURA_PAREDE,
    de.x, de.y - ALTURA_PAREDE - ESPESSURA_PAREDE,
  ])
  g.fill(paleta.paredeTopo)

  // espessura lateral, só na ponta externa (a ponta interna encosta na
  // outra parede e fica escondida)
  desenharPontaLateral(g, ate, foraNaPonta, cor, paleta)

  return g
}

export interface Cena {
  raiz: Container
  // a maquete é dona da mobília (dados + sprites). O modo de edição
  // fala com ela, nunca com os sprites direto.
  maquete: Maquete
  // recoloca os crachás depois que a maquete mexeu nos móveis
  redesenharAgentes: () => void
  // defeitos do JSON que não impedem de rodar — quem exibe é a
  // interface, porque console.warn se ignora
  problemas: string[]
  // a cor de fundo desta sala (pro app pintar o canvas antes do
  // primeiro frame, e pro menu entre salas usar como amostra)
  paleta: Paleta
  // liga/desliga o clique no crachá. Desligado em modo de edição: lá o
  // crachá tem que deixar o clique PASSAR pro móvel embaixo, senão a
  // cadeira em que o agente senta viraria impossível de arrastar.
  definirAgentesClicaveis: (podem: boolean) => void
  // reflete `agentes.estado` (GET /agentes) no anel de cada crachá —
  // chave é o id LOCAL (AGENTES[].id, ex: 'cifra'), não o id numérico
  // do backend (quem faz essa ponte é o chamador, via nome do agente)
  definirEstadosAgentes: (estados: Map<string, EstadoAgente>) => void
  // para o ticker de animação dos anéis — chamar no cleanup de quem
  // criou a cena, senão ele segue tentando desenhar em Graphics já
  // destruídos depois que o Pixi Application for destruído
  destruirAnimacoes: () => void
}

export interface OpcoesCena {
  aoClicarAgente?: (agenteId: string) => void
}

function paletaValida(p: unknown): p is Paleta {
  if (typeof p !== 'object' || p === null) return false
  const registro = p as Record<string, unknown>
  return CHAVES_PALETA.every((chave) => typeof registro[chave] === 'number')
}

export async function criarCena(dados: SalaDados, opcoes: OpcoesCena = {}): Promise<Cena> {
  // Falhas silenciosas são levantadas antes de desenhar qualquer
  // coisa. Vão pro console E pra tela: todas fazem a sala carregar
  // "quase certa", que é o pior tipo de defeito pra deixar escondido.
  const problemas = conferirSala(dados, AGENTES.map((a) => a.id))
  for (const problema of problemas) console.warn(`[sala] ${problema}`)

  // Tamanho/cor inválidos já foram denunciados acima — aqui só evitam
  // que a cena quebre por completo (NaN de tile, undefined de cor) e
  // o painel de aviso nem chegue a aparecer na tela.
  const colunas = typeof dados.colunas === 'number' && dados.colunas > 0 ? dados.colunas : 7
  const linhas = typeof dados.linhas === 'number' && dados.linhas > 0 ? dados.linhas : 7
  const paleta = paletaValida(dados.paleta) ? dados.paleta : PALETAS.neutra

  const maquete = new Maquete(dados)
  const [retratos] = await Promise.all([carregarRetratos(), maquete.montar()])

  const cena = new Container()
  const camadaMoveis = maquete.camada

  const { norte, leste, oeste } = cantos(colunas, linhas)

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
    desenharParede(norte, oeste, paleta.paredeEsquerda, janelaEsquerda, foraEsquerda, paleta),
    desenharParede(norte, leste, paleta.paredeDireita, janelaDireita, foraDireita, paleta),
    desenharLaje(colunas, linhas, paleta),
    desenharPiso(colunas, linhas, paleta),
  )

  cena.addChild(camadaMoveis)

  // Crachá do agente: fica na posição do móvel que ele ocupa,
  // "levantado" (altura) pra ficar por cima do encosto, como se fosse
  // a cabeça de quem senta ali.
  //
  // Quem responde "onde está a Cifra?" é o índice da maquete, nunca a
  // posição — por isso o agente pode estar em qualquer móvel, em
  // qualquer sala, sem nada aqui mudar.
  // Vão direto na camada dos móveis (e não num sub-container), senão
  // ficariam todos na profundidade do container e não se intercalariam
  // com a mobília — um agente do fundo apareceria na frente de uma
  // mesa da frente.
  const ALTURA_CRACHA = 0.62
  let crachas: Container[] = []
  // controlador do anel por agente — sobrevive a redesenharAgentes()
  // recriando o crachá, então o estado (falando/pensando/...) precisa
  // ser reaplicado depois de cada redesenho (linha "reaplica estado")
  const controladores = new Map<string, ControladorAnel>()
  const estadosAtuais = new Map<string, EstadoAgente>()
  // Começa clicável porque a sala nasce fora do modo de edição — o
  // editor desliga isso ao entrar em edição.
  let agentesClicaveis = true

  function redesenharAgentes() {
    for (const c of crachas) c.destroy({ children: true })
    crachas = []
    controladores.clear()

    for (const [agenteId, movel] of maquete.agentes()) {
      const agente = AGENTES.find((a) => a.id === agenteId)
      const retrato = retratos.get(agenteId)
      const recorte = RECORTES[agenteId]
      if (!agente || !retrato || !recorte) continue

      const { x, y } = paraTela(movel.coluna, movel.linha, ALTURA_CRACHA)
      const { container: avatar, controlador } = criarAvatar(retrato, recorte, agente.cor)
      avatar.x = x
      avatar.y = y
      controladores.set(agenteId, controlador)
      // reaplica estado (o crachá acabou de nascer com o anel parado)
      const estado = estadosAtuais.get(agenteId)
      if (estado) controlador.definirEstado(estado)

      // O crachá é recriado a cada redesenho, então o handler é ligado
      // aqui e não uma vez só. Ele consulta `agentesClicaveis` na HORA
      // do clique (em vez de ser montado/desmontado a cada troca de
      // modo) — mesmo padrão dos handlers de porta em edicao.ts.
      if (opcoes.aoClicarAgente) {
        avatar.eventMode = agentesClicaveis ? 'static' : 'none'
        avatar.cursor = agentesClicaveis ? 'pointer' : 'default'
        avatar.on('pointertap', () => {
          if (!agentesClicaveis) return
          opcoes.aoClicarAgente?.(agenteId)
        })
      }
      // logo à frente do móvel que o agente ocupa, pra ficar por cima
      // do encosto da cadeira
      avatar.zIndex = (maquete.spriteDe(movel.id)?.zIndex ?? 0) + 50
      camadaMoveis.addChild(avatar)
      crachas.push(avatar)
    }
  }

  function definirAgentesClicaveis(podem: boolean) {
    agentesClicaveis = podem
    for (const cracha of crachas) {
      cracha.eventMode = podem && opcoes.aoClicarAgente ? 'static' : 'none'
      cracha.cursor = podem && opcoes.aoClicarAgente ? 'pointer' : 'default'
    }
  }

  function definirEstadosAgentes(estados: Map<string, EstadoAgente>) {
    for (const [agenteId, estado] of estados) {
      estadosAtuais.set(agenteId, estado)
      controladores.get(agenteId)?.definirEstado(estado)
    }
  }

  // ticker próprio (não o do Pixi.Application) — a cena não precisa
  // saber que existe uma Application por trás, só precisa de "um
  // relógio rodando"; `Ticker.shared` já está ativo assim que qualquer
  // parte do Pixi é usada.
  let tempoAcumuladoMS = 0
  function aoTick(t: Ticker) {
    tempoAcumuladoMS += t.deltaMS
    for (const controlador of controladores.values()) controlador.animar(t.deltaMS, tempoAcumuladoMS)
  }
  Ticker.shared.add(aoTick)
  function destruirAnimacoes() {
    Ticker.shared.remove(aoTick)
  }

  redesenharAgentes()

  return {
    raiz: cena,
    maquete,
    redesenharAgentes,
    problemas,
    paleta,
    definirAgentesClicaveis,
    definirEstadosAgentes,
    destruirAnimacoes,
  }
}
