import type { Container, FederatedPointerEvent, Sprite } from 'pixi.js'
import { Graphics } from 'pixi.js'
import { paraTela, TILE_W, TILE_H } from './iso'
import type { Delta, Edicao } from './mobilia'

// ---------------------------------------------------------------
// MODO DE EDIÇÃO
//
// Existe porque descrever posição em palavras nunca funcionou: "um
// pouco mais pra trás" vira um vetor diferente dependendo de qual peça
// é e de que lado o agente senta, e cada rodada de "descreve → eu
// chuto o delta → renderiza → tá errado" custava caro. Aqui o chefe
// arrasta a peça e vê na hora; no fim o próprio app escreve o código.
//
// A saída sai no MESMO vocabulário do resto do arquivo
// (somar/escala/PARA_*), então é copiar e colar em mobilia.ts.
// ---------------------------------------------------------------

export interface ItemEditavel {
  info: Edicao
  sprite: Sprite
  altura: number
  delta: Delta
  deltaOriginal: Delta
  // objetos que andam junto com a peça, na mesma coluna/linha mas em
  // outra altura — hoje é o crachá do agente, que fica "em cima" da
  // cadeira. Sem isso, arrastar a cadeira deixava o rosto pra trás.
  seguidores?: { objeto: Container; altura: number }[]
}

export interface EstadoEditor {
  ativo: boolean
  selecionado: ItemEditavel | null
  passo: number
  mexidos: number
}

// (Δcoluna, Δlinha) → as duas direções nomeadas. É a inversa exata de
// somar(escala(PARA_FRENTE, v), escala(PARA_DIREITA, h)), já que os
// dois pares de direção são os eixos da tela: PARA_FRENTE = (1,1) e
// PARA_DIREITA = (1,-1).
export function decompor(d: Delta): { vertical: number; horizontal: number } {
  return {
    vertical: (d.coluna + d.linha) / 2, // + = PARA_FRENTE, − = PARA_TRAS
    horizontal: (d.coluna - d.linha) / 2, // + = PARA_DIREITA, − = PARA_ESQUERDA
  }
}

const CASAS_DECIMAIS = 3
function arredondar(n: number): number {
  const f = 10 ** CASAS_DECIMAIS
  return Math.round(n * f) / f
}

// Descrição curta pro HUD — o que aparece enquanto arrasta.
export function descrever(d: Delta): string {
  const { vertical, horizontal } = decompor(d)
  const partes: string[] = []
  if (Math.abs(vertical) >= 0.001) {
    partes.push(`${vertical > 0 ? 'frente' : 'trás'} ${Math.abs(arredondar(vertical))}`)
  }
  if (Math.abs(horizontal) >= 0.001) {
    partes.push(`${horizontal > 0 ? 'direita' : 'esquerda'} ${Math.abs(arredondar(horizontal))}`)
  }
  return partes.length > 0 ? partes.join(' · ') : 'centro da mesa'
}

// A mesma coisa, mas como código pronto pra colar.
export function formatarDelta(d: Delta): string {
  const { vertical, horizontal } = decompor(d)
  const partes: string[] = []
  if (Math.abs(vertical) >= 0.001) {
    const dir = vertical > 0 ? 'PARA_FRENTE' : 'PARA_TRAS'
    partes.push(`escala(${dir}, ${arredondar(Math.abs(vertical))})`)
  }
  if (Math.abs(horizontal) >= 0.001) {
    const dir = horizontal > 0 ? 'PARA_DIREITA' : 'PARA_ESQUERDA'
    partes.push(`escala(${dir}, ${arredondar(Math.abs(horizontal))})`)
  }
  if (partes.length === 0) return 'CENTRO_MESA'
  if (partes.length === 1) return partes[0]
  return `somar(${partes.join(', ')})`
}

// Movimento na tela → movimento no tabuleiro. Inversa de paraTela():
//   x = (c − l)·TILE_W/2   →   c − l = 2x/TILE_W
//   y = (c + l)·TILE_H/2   →   c + l = 2y/TILE_H
// (o termo da altura some porque aqui é diferença, não posição)
function telaParaGrade(dx: number, dy: number): Delta {
  return {
    coluna: dx / TILE_W + dy / TILE_H,
    linha: dy / TILE_H - dx / TILE_W,
  }
}

const PASSOS = [0.01, 0.025, 0.05, 0.1, 0.25]
const COR_MARCA = 0x4ade80

export interface Editor {
  estado: () => EstadoEditor
  alternar: () => void
  selecionarPorId: (id: string) => void
  ciclar: (passos: number) => void
  mover: (coluna: number, linha: number) => void
  mudarPasso: (passos: number) => void
  restaurar: () => void
  restaurarTudo: () => void
  codigo: () => string
  destruir: () => void
}

export function criarEditor(
  itens: ItemEditavel[],
  mundo: Container,
  palco: Container,
  aoMudar: () => void,
): Editor {
  let ativo = false
  let indice = 0
  let indicePasso = 2
  let arrastando: ItemEditavel | null = null
  let ultimoPonto: { x: number; y: number } | null = null

  // losango no chão marcando a peça selecionada — o mesmo formato do
  // tile, pra leitura na perspectiva ficar óbvia
  const marca = new Graphics()
  marca.visible = false
  marca.zIndex = 100000
  mundo.addChild(marca)

  function selecionado(): ItemEditavel | null {
    return itens[indice] ?? null
  }

  function posicionar(item: ItemEditavel) {
    const coluna = item.info.origem.coluna + item.delta.coluna
    const linha = item.info.origem.linha + item.delta.linha
    const { x, y } = paraTela(coluna, linha, item.altura)
    item.sprite.x = x
    item.sprite.y = y

    for (const s of item.seguidores ?? []) {
      const p = paraTela(coluna, linha, s.altura)
      s.objeto.x = p.x
      s.objeto.y = p.y
    }
  }

  function redesenharMarca() {
    marca.clear()
    const item = selecionado()
    if (!ativo || !item) {
      marca.visible = false
      return
    }
    const coluna = item.info.origem.coluna + item.delta.coluna
    const linha = item.info.origem.linha + item.delta.linha
    const { x, y } = paraTela(coluna, linha)
    const hw = TILE_W / 2
    const hh = TILE_H / 2
    marca.poly([x, y - hh, x + hw, y, x, y + hh, x - hw, y])
    marca.stroke({ width: 3, color: COR_MARCA, alpha: 0.95 })
    marca.circle(x, y, 5).fill({ color: COR_MARCA, alpha: 0.95 })
    marca.visible = true
  }

  function notificar() {
    redesenharMarca()
    aoMudar()
  }

  function aoApertar(evento: FederatedPointerEvent, item: ItemEditavel) {
    if (!ativo) return
    evento.stopPropagation()
    indice = itens.indexOf(item)
    arrastando = item
    ultimoPonto = mundo.toLocal(evento.global)
    notificar()
  }

  function aoMover(evento: FederatedPointerEvent) {
    if (!ativo || !arrastando || !ultimoPonto) return
    const agora = mundo.toLocal(evento.global)
    const passo = telaParaGrade(agora.x - ultimoPonto.x, agora.y - ultimoPonto.y)
    arrastando.delta = {
      coluna: arrastando.delta.coluna + passo.coluna,
      linha: arrastando.delta.linha + passo.linha,
    }
    posicionar(arrastando)
    ultimoPonto = agora
    notificar()
  }

  function aoSoltar() {
    arrastando = null
    ultimoPonto = null
  }

  palco.eventMode = 'static'
  palco.on('pointermove', aoMover)
  palco.on('pointerup', aoSoltar)
  palco.on('pointerupoutside', aoSoltar)

  for (const item of itens) {
    item.sprite.on('pointerdown', (e: FederatedPointerEvent) => aoApertar(e, item))
  }

  function aplicarInteratividade() {
    for (const item of itens) {
      item.sprite.eventMode = ativo ? 'static' : 'none'
      item.sprite.cursor = ativo ? 'move' : 'default'
      item.sprite.alpha = ativo && item !== selecionado() ? 0.85 : 1
    }
  }

  return {
    estado: () => ({
      ativo,
      selecionado: selecionado(),
      passo: PASSOS[indicePasso],
      mexidos: itens.filter(
        (i) =>
          Math.abs(i.delta.coluna - i.deltaOriginal.coluna) >= 0.001 ||
          Math.abs(i.delta.linha - i.deltaOriginal.linha) >= 0.001,
      ).length,
    }),

    alternar() {
      ativo = !ativo
      arrastando = null
      aplicarInteratividade()
      notificar()
    },

    selecionarPorId(id: string) {
      const achado = itens.findIndex((i) => i.info.id === id)
      if (achado >= 0) indice = achado
      aplicarInteratividade()
      notificar()
    },

    ciclar(passos: number) {
      indice = (indice + passos + itens.length) % itens.length
      aplicarInteratividade()
      notificar()
    },

    mover(coluna: number, linha: number) {
      const item = selecionado()
      if (!item) return
      const p = PASSOS[indicePasso]
      item.delta = {
        coluna: item.delta.coluna + coluna * p,
        linha: item.delta.linha + linha * p,
      }
      posicionar(item)
      notificar()
    },

    mudarPasso(passos: number) {
      indicePasso = Math.max(0, Math.min(PASSOS.length - 1, indicePasso + passos))
      notificar()
    },

    restaurar() {
      const item = selecionado()
      if (!item) return
      item.delta = { ...item.deltaOriginal }
      posicionar(item)
      notificar()
    },

    restaurarTudo() {
      for (const item of itens) {
        item.delta = { ...item.deltaOriginal }
        posicionar(item)
      }
      notificar()
    },

    // Gera só o que MUDOU, agrupado por posto, no formato exato dos
    // campos de POSTOS — é colar por cima da linha correspondente.
    codigo() {
      const mudados = itens.filter(
        (i) =>
          Math.abs(i.delta.coluna - i.deltaOriginal.coluna) >= 0.001 ||
          Math.abs(i.delta.linha - i.deltaOriginal.linha) >= 0.001,
      )
      if (mudados.length === 0) return '// nada foi movido ainda'

      const linhas: string[] = ['// mobilia.ts — cole por cima das linhas correspondentes']
      let grupoAtual = ''
      for (const item of mudados) {
        if (item.info.grupo !== grupoAtual) {
          grupoAtual = item.info.grupo
          linhas.push('', `// ${grupoAtual}`)
        }
        if (item.info.campo) {
          linhas.push(`${item.info.campo}: ${formatarDelta(item.delta)},`)
        } else {
          // peça sem campo em Posto (as mesas): o delta É a posição
          linhas.push(
            `coluna: ${arredondar(item.delta.coluna)}, linha: ${arredondar(item.delta.linha)},`,
          )
        }
      }
      return linhas.join('\n')
    },

    destruir() {
      palco.off('pointermove', aoMover)
      palco.off('pointerup', aoSoltar)
      palco.off('pointerupoutside', aoSoltar)
      marca.destroy()
    },
  }
}
