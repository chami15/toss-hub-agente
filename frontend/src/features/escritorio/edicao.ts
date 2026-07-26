import type { Container, FederatedPointerEvent } from 'pixi.js'
import { Graphics } from 'pixi.js'
import { paraTela, TILE_W, TILE_H } from './iso'
import type { Cena } from './cena'
import type { MovelSala } from './sala-dados'
import { novoId } from './sala-dados'
import type { Direcao } from './sala'
import {
  descartarRascunho,
  salaDaFonte,
  salvarRascunho,
  temRascunho,
  type Camada,
} from './persistencia'

// ---------------------------------------------------------------
// MODO DE EDIÇÃO
//
// Existe porque descrever posição em palavras nunca funcionou: "um
// pouco mais pra trás" vira um vetor diferente dependendo da peça e
// de que lado o agente senta, e cada rodada de "descreve → chuto o
// delta → renderiza → tá errado" custava caro. Aqui o chefe arrasta e
// vê na hora, escolhe o móvel num catálogo, e nada disso passa por
// mim.
//
// O editor não mexe em sprite: ele fala com a Maquete, que mantém
// dado e sprite em sincronia.
// ---------------------------------------------------------------

export interface EstadoEditor {
  ativo: boolean
  selecionado: MovelSala | null
  passo: number
  camada: Camada
  sujo: boolean
  totalMoveis: number
}

const PASSOS = [0.01, 0.025, 0.05, 0.1, 0.25]
const COR_MARCA = 0x4ade80

// Movimento na tela → movimento no tabuleiro. Inversa de paraTela():
//   x = (c − l)·TILE_W/2   →   c − l = 2x/TILE_W
//   y = (c + l)·TILE_H/2   →   c + l = 2y/TILE_H
// (o termo da altura some porque aqui é diferença, não posição)
function telaParaGrade(dx: number, dy: number): { coluna: number; linha: number } {
  return {
    coluna: dx / TILE_W + dy / TILE_H,
    linha: dy / TILE_H - dx / TILE_W,
  }
}

export interface Editor {
  estado: () => EstadoEditor
  alternar: () => void
  selecionar: (id: string | null) => void
  ciclar: (passos: number) => void
  mover: (coluna: number, linha: number) => void
  girar: (passos: number) => void
  mudarAltura: (delta: number) => void
  mudarPasso: (passos: number) => void
  adicionar: (peca: string) => void
  remover: () => void
  atribuirAgente: (agenteId: string | null) => void
  apoiarNoDeBaixo: () => void
  salvarRascunho: () => void
  voltarParaFonte: () => void
  json: () => string
  destruir: () => void
}

export function criarEditor(
  cena: Cena,
  mundo: Container,
  palco: Container,
  aoMudar: () => void,
): Editor {
  const maquete = cena.maquete
  let ativo = false
  let selecionadoId: string | null = null
  let indicePasso = 2
  let camada: Camada = temRascunho() ? 'rascunho' : 'fonte'
  let sujo = false
  let arrastando: string | null = null
  let ultimoPonto: { x: number; y: number } | null = null

  // losango no chão marcando a peça selecionada — o mesmo formato do
  // tile, pra leitura na perspectiva ficar óbvia
  const marca = new Graphics()
  marca.visible = false
  marca.zIndex = 1_000_000
  maquete.camada.addChild(marca)

  function selecionado(): MovelSala | null {
    return selecionadoId ? (maquete.movel(selecionadoId) ?? null) : null
  }

  function redesenharMarca() {
    marca.clear()
    const m = selecionado()
    if (!ativo || !m) {
      marca.visible = false
      return
    }
    const { x, y } = paraTela(m.coluna, m.linha)
    const hw = TILE_W / 2
    const hh = TILE_H / 2
    marca.poly([x, y - hh, x + hw, y, x, y + hh, x - hw, y])
    marca.stroke({ width: 3, color: COR_MARCA, alpha: 0.95 })
    marca.circle(x, y, 5).fill({ color: COR_MARCA, alpha: 0.95 })
    // uma haste até a peça, que pode estar levantada (em cima da mesa)
    if (m.altura) {
      const topo = paraTela(m.coluna, m.linha, m.altura)
      marca.moveTo(x, y).lineTo(topo.x, topo.y)
      marca.stroke({ width: 2, color: COR_MARCA, alpha: 0.6 })
    }
    marca.visible = true
  }

  function notificar(mexeu = false) {
    if (mexeu) sujo = true
    redesenharMarca()
    cena.redesenharAgentes()
    aoMudar()
  }

  function aplicarInteratividade() {
    for (const m of maquete.moveis) {
      const sprite = maquete.spriteDe(m.id)
      if (!sprite) continue
      sprite.eventMode = ativo ? 'static' : 'none'
      sprite.cursor = ativo ? 'move' : 'default'
    }
  }

  // Liga o clique de um sprite. Chamado de novo a cada peça
  // adicionada, senão a peça nova nasceria sem poder ser selecionada.
  function ligarClique(id: string) {
    const sprite = maquete.spriteDe(id)
    if (!sprite) return
    sprite.on('pointerdown', (e: FederatedPointerEvent) => {
      if (!ativo) return
      e.stopPropagation()
      selecionadoId = id
      arrastando = id
      ultimoPonto = mundo.toLocal(e.global)
      notificar()
    })
  }

  for (const m of maquete.moveis) ligarClique(m.id)

  function aoMoverPonteiro(e: FederatedPointerEvent) {
    if (!ativo || !arrastando || !ultimoPonto) return
    const agora = mundo.toLocal(e.global)
    const passo = telaParaGrade(agora.x - ultimoPonto.x, agora.y - ultimoPonto.y)
    maquete.mover(arrastando, passo.coluna, passo.linha)
    ultimoPonto = agora
    notificar(true)
  }

  function aoSoltar() {
    arrastando = null
    ultimoPonto = null
  }

  palco.eventMode = 'static'
  palco.on('pointermove', aoMoverPonteiro)
  palco.on('pointerup', aoSoltar)
  palco.on('pointerupoutside', aoSoltar)

  // Onde colocar uma peça nova: no centro da sala, que é sempre
  // visível — nascer numa quina faria o chefe caçar a peça.
  function centroDaSala(): { coluna: number; linha: number } {
    return {
      coluna: (maquete.sala.colunas - 1) / 2,
      linha: (maquete.sala.linhas - 1) / 2,
    }
  }

  return {
    estado: () => ({
      ativo,
      selecionado: selecionado(),
      passo: PASSOS[indicePasso],
      camada,
      sujo,
      totalMoveis: maquete.moveis.length,
    }),

    alternar() {
      ativo = !ativo
      arrastando = null
      aplicarInteratividade()
      notificar()
    },

    selecionar(id) {
      selecionadoId = id
      notificar()
    },

    ciclar(passos) {
      const lista = maquete.moveis
      if (lista.length === 0) return
      const atual = lista.findIndex((m) => m.id === selecionadoId)
      const proximo = (atual + passos + lista.length) % lista.length
      selecionadoId = lista[proximo].id
      notificar()
    },

    mover(coluna, linha) {
      if (!selecionadoId) return
      const p = PASSOS[indicePasso]
      maquete.mover(selecionadoId, coluna * p, linha * p)
      notificar(true)
    },

    girar(passos) {
      if (!selecionadoId) return
      void maquete.girar(selecionadoId, passos).then(() => notificar(true))
    },

    mudarAltura(delta) {
      if (!selecionadoId) return
      maquete.mudarAltura(selecionadoId, delta)
      notificar(true)
    },

    mudarPasso(passos) {
      indicePasso = Math.max(0, Math.min(PASSOS.length - 1, indicePasso + passos))
      notificar()
    },

    adicionar(peca) {
      const existentes = new Set(maquete.moveis.map((m) => m.id))
      const novo: MovelSala = {
        id: novoId(peca, existentes),
        peca,
        direcao: 'NE' as Direcao,
        ...centroDaSala(),
      }
      void maquete.adicionar(novo).then(() => {
        ligarClique(novo.id)
        const sprite = maquete.spriteDe(novo.id)
        if (sprite) {
          sprite.eventMode = ativo ? 'static' : 'none'
          sprite.cursor = ativo ? 'move' : 'default'
        }
        selecionadoId = novo.id
        notificar(true)
      })
    },

    remover() {
      if (!selecionadoId) return
      maquete.remover(selecionadoId)
      selecionadoId = null
      notificar(true)
    },

    atribuirAgente(agenteId) {
      if (!selecionadoId) return
      maquete.atribuirAgente(selecionadoId, agenteId)
      notificar(true)
    },

    // Apoia a peça selecionada no móvel mais próximo que esteja
    // abaixo dela — é o que faz o abajur ficar "em cima da mesa" e
    // não sumir atrás dela.
    apoiarNoDeBaixo() {
      const m = selecionado()
      if (!m) return
      if (m.sobre) {
        maquete.apoiarEm(m.id, null)
        notificar(true)
        return
      }
      let melhor: MovelSala | null = null
      let menor = Infinity
      for (const outro of maquete.moveis) {
        if (outro.id === m.id || outro.sobre) continue
        const d = Math.hypot(outro.coluna - m.coluna, outro.linha - m.linha)
        // meia casa de tolerância: tem que estar mesmo por cima
        if (d < menor && d < 0.5) {
          menor = d
          melhor = outro
        }
      }
      if (melhor) maquete.apoiarEm(m.id, melhor.id)
      notificar(true)
    },

    salvarRascunho() {
      salvarRascunho(maquete.exportar())
      camada = 'rascunho'
      sujo = false
      notificar()
    },

    voltarParaFonte() {
      descartarRascunho()
      camada = 'fonte'
      sujo = false
      // recarrega: é mais simples e mais confiável que desfazer
      // móvel por móvel, e o chefe já confirmou que quer descartar
      window.location.reload()
    },

    json: () => JSON.stringify(maquete.exportar(), null, 2),

    destruir() {
      palco.off('pointermove', aoMoverPonteiro)
      palco.off('pointerup', aoSoltar)
      palco.off('pointerupoutside', aoSoltar)
      marca.destroy()
    },
  }
}

export { salaDaFonte }
