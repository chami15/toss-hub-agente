import { Container, Graphics } from 'pixi.js'
import { paraTela, TILE_W, TILE_H, TILE_ALTURA } from './iso'
import {
  tilesDaPlanta,
  TOTAL_COLUNAS,
  TOTAL_LINHAS,
  PALETA,
  ESPESSURA_LAJE,
  ALTURA_PAREDE,
} from './sala'

// Monta o cenário da sala: laje + piso + paredes. Só a "casca" do
// ambiente — os móveis (sprites do Kenney) e os agentes entram depois,
// em containers próprios por cima deste.

// Os 4 cantos externos da planta, em pixel. paraTela(c - 0.5, l - 0.5)
// devolve o vértice superior do tile (c, l), então deslocando meio tile
// em cada eixo chegamos nas quinas do retângulo inteiro.
function cantosDaPlanta() {
  return {
    norte: paraTela(-0.5, -0.5),
    leste: paraTela(TOTAL_COLUNAS - 0.5, -0.5),
    sul: paraTela(TOTAL_COLUNAS - 0.5, TOTAL_LINHAS - 0.5),
    oeste: paraTela(-0.5, TOTAL_LINHAS - 0.5),
  }
}

// A espessura da laje: as duas faces da frente (oeste->sul e sul->leste)
// extrudadas pra baixo. É o que dá o ar de maquete vista de fora.
function criarLaje(): Graphics {
  const { leste, sul, oeste } = cantosDaPlanta()
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
  g.fill(PALETA.lajeLateral)

  return g
}

function criarPiso(): Graphics {
  const g = new Graphics()
  const hw = TILE_W / 2
  const hh = TILE_H / 2

  for (const { coluna, linha } of tilesDaPlanta()) {
    const { x, y } = paraTela(coluna, linha)
    g.poly([x, y - hh, x + hw, y, x, y + hh, x - hw, y])
    g.fill((coluna + linha) % 2 === 0 ? PALETA.pisoClaro : PALETA.pisoEscuro)
    g.stroke({ width: 1, color: PALETA.pisoLinha, alignment: 0.5 })
  }

  return g
}

// Uma parede: corre da quina `de` até a quina `ate` (ambas na linha do
// piso) e sobe ALTURA_PAREDE. Ganha uma faixa mais clara no topo (a
// espessura da parede vista de cima) e um rodapé mais escuro embaixo.
function criarParede(
  de: { x: number; y: number },
  ate: { x: number; y: number },
  corFace: number,
): Graphics {
  const g = new Graphics()
  const altura = ALTURA_PAREDE * TILE_ALTURA
  const espessuraTopo = 8
  const alturaRodape = 10

  g.poly([
    de.x, de.y,
    ate.x, ate.y,
    ate.x, ate.y - altura,
    de.x, de.y - altura,
  ])
  g.fill(corFace)

  g.poly([
    de.x, de.y - altura,
    ate.x, ate.y - altura,
    ate.x, ate.y - altura - espessuraTopo,
    de.x, de.y - altura - espessuraTopo,
  ])
  g.fill(PALETA.paredeTopo)

  g.poly([
    de.x, de.y,
    ate.x, ate.y,
    ate.x, ate.y - alturaRodape,
    de.x, de.y - alturaRodape,
  ])
  g.fill(PALETA.rodape)

  return g
}

export function criarCena(): Container {
  const cena = new Container()
  const { norte, leste, oeste } = cantosDaPlanta()

  // ordem importa: parede de trás primeiro, piso por cima (assim o
  // rodapé encosta no chão sem vão), laje por baixo de tudo.
  cena.addChild(criarLaje())
  cena.addChild(criarParede(norte, oeste, PALETA.paredeEsquerda))
  cena.addChild(criarParede(norte, leste, PALETA.paredeFundo))
  cena.addChild(criarPiso())

  return cena
}
