import { describe, expect, it } from 'vitest'
import { paraTela, profundidade, TILE_W, TILE_H } from '../iso'

// A matemática isométrica é a fonte histórica da maioria dos bugs
// deste frontend, e é justamente o tipo de coisa que quebra em
// silêncio: nada dá erro, só fica torto na tela.

// Cópia da inversa usada pelo arraste (edicao.ts). Está duplicada aqui
// de propósito: se alguém mudar a projeção sem mudar a inversa, o
// teste de ida-e-volta quebra — que é exatamente o alarme que se quer.
function telaParaGrade(dx: number, dy: number) {
  return {
    coluna: dx / TILE_W + dy / TILE_H,
    linha: dy / TILE_H - dx / TILE_W,
  }
}

describe('paraTela', () => {
  it('põe a origem no zero', () => {
    expect(paraTela(0, 0)).toEqual({ x: 0, y: 0 })
  })

  it('anda na DIAGONAL da tela quando só a coluna muda', () => {
    // a armadilha nº1 do projeto: casas vizinhas no tabuleiro não
    // formam linha reta na tela
    const p = paraTela(1, 0)
    expect(p.x).not.toBe(0)
    expect(p.y).not.toBe(0)
  })

  it('anda na horizontal pura com (+k, −k)', () => {
    const p = paraTela(1, -1)
    expect(p.y).toBe(0)
    expect(p.x).toBe(TILE_W)
  })

  it('anda na vertical pura com (+k, +k)', () => {
    const p = paraTela(1, 1)
    expect(p.x).toBe(0)
    expect(p.y).toBe(TILE_H)
  })

  it('a altura só levanta, não desloca de lado', () => {
    const chao = paraTela(2, 3)
    const alto = paraTela(2, 3, 0.5)
    expect(alto.x).toBe(chao.x)
    expect(alto.y).toBeLessThan(chao.y)
  })
})

describe('profundidade', () => {
  it('cresce indo pra frente da sala', () => {
    expect(profundidade(2, 2)).toBeGreaterThan(profundidade(1, 1))
  })

  it('é igual pra casas na mesma faixa diagonal', () => {
    // consequência direta de coluna+linha: é o que faz duas peças
    // "lado a lado" na tela empatarem e precisarem de desempate
    expect(profundidade(3, 1)).toBe(profundidade(1, 3))
  })
})

describe('ida e volta tela ↔ tabuleiro', () => {
  // É isto que o arraste faz: converte movimento de mouse em
  // movimento de tabuleiro. Se as duas contas divergirem, a peça
  // "escorrega" do cursor — sem erro nenhum no console.
  const casos = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
    [-2, 3],
    [0.37, -1.85],
    [12.5, 7.25],
  ] as const

  it.each(casos)('preserva (%s, %s)', (coluna, linha) => {
    const { x, y } = paraTela(coluna, linha)
    const volta = telaParaGrade(x, y)
    expect(volta.coluna).toBeCloseTo(coluna, 10)
    expect(volta.linha).toBeCloseTo(linha, 10)
  })
})
