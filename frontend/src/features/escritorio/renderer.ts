import { tileParaPixel, TILE_W, TILE_H } from './iso'
import type { RoomConfig } from './room'
import { MESAS, profundidade, type Mesa } from './furniture'

// Renderer — a única peça que sabe desenhar. Recebe um
// CanvasRenderingContext2D + os dados (Room, mesas) e pinta tudo na
// ordem certa: piso -> paredes -> móveis (por profundidade, fundo pra
// frente). Nada aqui guarda estado; é só uma função de desenho pura.

// Origem: onde o tile (coluna=0, linha=0) cai no canvas. Deixa espaço
// em cima pra parede e nas laterais pro grid caber inteiro.
const ORIGEM_X = 480
const ORIGEM_Y = 210

function paraCanvas(coluna: number, linha: number) {
  const p = tileParaPixel(coluna, linha)
  return { x: ORIGEM_X + p.x, y: ORIGEM_Y + p.y }
}

// Paleta clean/flat — tons neutros, sem contorno preto pesado (contorno
// bem fino e só um pouco mais escuro que o preenchimento).
const COR = {
  fundoPagina: '#f4f2ee',
  pisoClaro: '#eae7e1',
  pisoEscuro: '#e1ddd4',
  pisoGrude: '#d5cfc3',
  paredeEsquerda: '#d9d4c9',
  paredeFundo: '#cfc9bb',
  janelaTopo: '#eef4f6',
  janelaBase: '#cfe0e6',
  janelaMoldura: '#c3bdb0',
  mesaChefeTampo: '#5c554b',
  mesaChefePerna: '#2b2822',
  mesaAgenteTampo: '#f7f5f0',
  mesaAgentePerna: '#8f8a7e',
  sombra: 'rgba(20, 18, 14, 0.16)',
}

function desenharLosango(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  larguraTiles: number,
  alturaTiles: number,
) {
  const hw = (TILE_W * larguraTiles) / 2
  const hh = (TILE_H * alturaTiles) / 2
  ctx.beginPath()
  ctx.moveTo(cx, cy - hh)
  ctx.lineTo(cx + hw, cy)
  ctx.lineTo(cx, cy + hh)
  ctx.lineTo(cx - hw, cy)
  ctx.closePath()
}

function desenharPiso(ctx: CanvasRenderingContext2D, sala: RoomConfig) {
  for (let linha = 0; linha < sala.linhas; linha++) {
    for (let coluna = 0; coluna < sala.colunas; coluna++) {
      const { x, y } = paraCanvas(coluna + 0.5, linha + 0.5)
      desenharLosango(ctx, x, y, 1, 1)
      ctx.fillStyle = (coluna + linha) % 2 === 0 ? COR.pisoClaro : COR.pisoEscuro
      ctx.fill()
      ctx.strokeStyle = COR.pisoGrude
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }
}

function desenharParedes(ctx: CanvasRenderingContext2D, sala: RoomConfig) {
  const pInicioEsq = paraCanvas(0, sala.linhas)
  const pFimEsq = paraCanvas(0, 0)
  const pInicioFundo = paraCanvas(0, 0)
  const pFimFundo = paraCanvas(sala.colunas, 0)

  // parede esquerda (varia linha, coluna=0)
  ctx.beginPath()
  ctx.moveTo(pInicioEsq.x, pInicioEsq.y)
  ctx.lineTo(pFimEsq.x, pFimEsq.y)
  ctx.lineTo(pFimEsq.x, pFimEsq.y - sala.alturaParede)
  ctx.lineTo(pInicioEsq.x, pInicioEsq.y - sala.alturaParede)
  ctx.closePath()
  const gradEsq = ctx.createLinearGradient(0, pInicioEsq.y - sala.alturaParede, 0, pInicioEsq.y)
  gradEsq.addColorStop(0, COR.paredeEsquerda)
  gradEsq.addColorStop(1, COR.paredeFundo)
  ctx.fillStyle = gradEsq
  ctx.fill()

  // parede de fundo (varia coluna, linha=0)
  ctx.beginPath()
  ctx.moveTo(pInicioFundo.x, pInicioFundo.y)
  ctx.lineTo(pFimFundo.x, pFimFundo.y)
  ctx.lineTo(pFimFundo.x, pFimFundo.y - sala.alturaParede)
  ctx.lineTo(pInicioFundo.x, pInicioFundo.y - sala.alturaParede)
  ctx.closePath()
  const gradFundo = ctx.createLinearGradient(0, pInicioFundo.y - sala.alturaParede, 0, pInicioFundo.y)
  gradFundo.addColorStop(0, COR.paredeFundo)
  gradFundo.addColorStop(1, COR.paredeEsquerda)
  ctx.fillStyle = gradFundo
  ctx.fill()

  // janelas, encaixadas na parede de fundo
  for (const janela of sala.janelas) {
    const pEsq = paraCanvas(janela.coluna, 0)
    const pDir = paraCanvas(janela.coluna + janela.largura, 0)
    const topo = sala.alturaParede * 0.72
    const base = sala.alturaParede * 0.24
    ctx.beginPath()
    ctx.moveTo(pEsq.x, pEsq.y - base)
    ctx.lineTo(pDir.x, pDir.y - base)
    ctx.lineTo(pDir.x, pDir.y - topo)
    ctx.lineTo(pEsq.x, pEsq.y - topo)
    ctx.closePath()
    const gradJanela = ctx.createLinearGradient(0, pEsq.y - topo, 0, pEsq.y - base)
    gradJanela.addColorStop(0, COR.janelaTopo)
    gradJanela.addColorStop(1, COR.janelaBase)
    ctx.fillStyle = gradJanela
    ctx.fill()
    ctx.strokeStyle = COR.janelaMoldura
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

function desenharMesa(ctx: CanvasRenderingContext2D, mesa: Mesa) {
  const centro = paraCanvas(mesa.coluna, mesa.linha)
  const raioPx = { x: (TILE_W * mesa.raio) / 2, y: (TILE_H * mesa.raio) / 2 }
  const ehChefe = mesa.papel === 'chefe'
  const corTampo = ehChefe ? COR.mesaChefeTampo : COR.mesaAgenteTampo
  const corPerna = ehChefe ? COR.mesaChefePerna : COR.mesaAgentePerna

  // sombra suave no piso, embaixo da mesa
  ctx.save()
  ctx.filter = 'blur(6px)'
  ctx.beginPath()
  ctx.ellipse(centro.x, centro.y + raioPx.y * 0.3, raioPx.x * 1.05, raioPx.y * 0.9, 0, 0, Math.PI * 2)
  ctx.fillStyle = COR.sombra
  ctx.fill()
  ctx.restore()

  // pernas — 4 pontas do losango, levemente abaixo do tampo
  const pontos = [
    { x: centro.x, y: centro.y - raioPx.y },
    { x: centro.x + raioPx.x, y: centro.y },
    { x: centro.x, y: centro.y + raioPx.y },
    { x: centro.x - raioPx.x, y: centro.y },
  ]
  const larguraPerna = Math.max(6, raioPx.x * 0.14)
  for (const p of pontos) {
    ctx.fillStyle = corPerna
    ctx.beginPath()
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(p.x - larguraPerna / 2, p.y - 2, larguraPerna, 22, 3)
    } else {
      ctx.rect(p.x - larguraPerna / 2, p.y - 2, larguraPerna, 22)
    }
    ctx.fill()
  }

  // tampo, por cima das pernas
  desenharLosango(ctx, centro.x, centro.y, mesa.raio * 2, mesa.raio * 2)
  ctx.fillStyle = corTampo
  ctx.fill()
  ctx.strokeStyle = ehChefe ? '#201e1a' : '#d8d3c6'
  ctx.lineWidth = 1.5
  ctx.stroke()
}

export function desenharSala(ctx: CanvasRenderingContext2D, sala: RoomConfig, larguraCanvas: number, alturaCanvas: number) {
  ctx.clearRect(0, 0, larguraCanvas, alturaCanvas)
  ctx.fillStyle = COR.fundoPagina
  ctx.fillRect(0, 0, larguraCanvas, alturaCanvas)

  desenharPiso(ctx, sala)
  desenharParedes(ctx, sala)

  const mesasOrdenadas = [...MESAS].sort((a, b) => profundidade(a) - profundidade(b))
  for (const mesa of mesasOrdenadas) {
    desenharMesa(ctx, mesa)
  }
}
