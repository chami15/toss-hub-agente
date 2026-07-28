import { beforeEach, describe, expect, it } from 'vitest'
import { criarPortaEspelhada } from '../porta-espelho'
import { lerRascunho, salvarRascunho } from '../persistencia'
import type { MovelSala } from '../sala-dados'

// O espelho é o que garante que toda porta nova tem volta — sem ele,
// a sala de destino nasceria sem nenhum jeito de sair a não ser pelo
// modo de edição. Os testes usam uma sala FAKE como destino, semeada
// via rascunho: criarPortaEspelhada lê rascunho-se-existir-senão-fonte,
// e semear o rascunho evita precisar de um arquivo de verdade em
// salas/ só pra este teste.

function localStorageFalso(): Storage {
  const dados = new Map<string, string>()
  return {
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
    removeItem: (k) => void dados.delete(k),
    clear: () => dados.clear(),
    key: (i) => [...dados.keys()][i] ?? null,
    get length() {
      return dados.size
    },
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageFalso(), configurable: true })
})

function porta(coluna: number, linha: number, direcao: MovelSala['direcao'] = 'NW'): MovelSala {
  return { id: 'porta-origem', peca: 'doorway', direcao, coluna, linha }
}

describe('criarPortaEspelhada', () => {
  it('TROCA os eixos: coluna da origem vira linha do destino', () => {
    salvarRascunho('destino', { nome: 'Destino', colunas: 5, linhas: 5, paleta: {} as never, moveis: [] })

    // o caso que o chefe descreveu: porta na última COLUNA de um lado
    // tem que reaparecer na última LINHA do outro
    criarPortaEspelhada('origem', { colunas: 5, linhas: 5 }, porta(4, 0), 'destino')

    const espelho = lerRascunho('destino')?.moveis[0]
    expect(espelho).toBeDefined()
    expect(espelho?.coluna).toBe(0)
    expect(espelho?.linha).toBe(4)
  })

  it('a troca de eixos continua proporcional entre salas de tamanhos diferentes', () => {
    salvarRascunho('destino', { nome: 'Destino', colunas: 5, linhas: 5, paleta: {} as never, moveis: [] })

    // última coluna de uma sala 11×11 (fração 1.0) → última LINHA de uma
    // 5×5, que é 4. Sem a proporção, o 10 viraria uma linha fora da grade.
    criarPortaEspelhada('origem', { colunas: 11, linhas: 11 }, porta(10, 0), 'destino')

    const espelho = lerRascunho('destino')?.moveis[0]
    expect(espelho?.linha).toBe(4)
    expect(espelho?.coluna).toBe(0)
  })

  it('o espelho nunca cai fora da grade da sala de destino', () => {
    // a regressão que o eixo trocado poderia introduzir: uma sala larga
    // e baixa espelhada numa estreita e alta, e vice-versa
    salvarRascunho('destino', { nome: 'Destino', colunas: 4, linhas: 12, paleta: {} as never, moveis: [] })
    criarPortaEspelhada('origem', { colunas: 12, linhas: 4 }, porta(11, 3), 'destino')

    const espelho = lerRascunho('destino')?.moveis[0]
    expect(espelho!.coluna).toBeGreaterThanOrEqual(0)
    expect(espelho!.coluna).toBeLessThanOrEqual(3)
    expect(espelho!.linha).toBeGreaterThanOrEqual(0)
    expect(espelho!.linha).toBeLessThanOrEqual(11)
  })

  it('inverte a direção como se fosse vista de fora (N/S troca, L/O mantém)', () => {
    salvarRascunho('destino', { nome: 'Destino', colunas: 5, linhas: 5, paleta: {} as never, moveis: [] })
    const casos: [MovelSala['direcao'], MovelSala['direcao']][] = [
      ['NW', 'SW'],
      ['SW', 'NW'],
      ['NE', 'SE'],
      ['SE', 'NE'],
    ]
    for (const [de, esperada] of casos) {
      salvarRascunho('destino', { nome: 'Destino', colunas: 5, linhas: 5, paleta: {} as never, moveis: [] })
      criarPortaEspelhada('origem', { colunas: 5, linhas: 5 }, porta(0, 0, de), 'destino')
      expect(lerRascunho('destino')?.moveis[0].direcao).toBe(esperada)
    }
  })

  it('leva do espelho aponta de volta pra sala de origem', () => {
    salvarRascunho('destino', { nome: 'Destino', colunas: 5, linhas: 5, paleta: {} as never, moveis: [] })
    criarPortaEspelhada('origem', { colunas: 5, linhas: 5 }, porta(2, 2), 'destino')
    expect(lerRascunho('destino')?.moveis[0].leva).toBe('origem')
  })

  it('não sobrescreve móveis que já estavam na sala de destino', () => {
    salvarRascunho('destino', {
      nome: 'Destino',
      colunas: 5,
      linhas: 5,
      paleta: {} as never,
      moveis: [{ id: 'mesa-existente', peca: 'desk', direcao: 'NE', coluna: 1, linha: 1 }],
    })
    criarPortaEspelhada('origem', { colunas: 5, linhas: 5 }, porta(0, 0), 'destino')
    const moveis = lerRascunho('destino')?.moveis ?? []
    expect(moveis).toHaveLength(2)
    expect(moveis.some((m) => m.id === 'mesa-existente')).toBe(true)
  })

  it('duas portas em sequência não colidem de id', () => {
    salvarRascunho('destino', { nome: 'Destino', colunas: 5, linhas: 5, paleta: {} as never, moveis: [] })
    criarPortaEspelhada('origem', { colunas: 5, linhas: 5 }, porta(0, 0), 'destino')
    criarPortaEspelhada('origem', { colunas: 5, linhas: 5 }, { ...porta(1, 1), id: 'porta-origem-2' }, 'destino')
    const ids = lerRascunho('destino')?.moveis.map((m) => m.id) ?? []
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('sala 1×1 não divide por zero (fração cai em 0, não em Infinity/NaN)', () => {
    salvarRascunho('destino', { nome: 'Destino', colunas: 1, linhas: 1, paleta: {} as never, moveis: [] })
    criarPortaEspelhada('origem', { colunas: 1, linhas: 1 }, porta(0, 0), 'destino')
    const espelho = lerRascunho('destino')?.moveis[0]
    expect(espelho?.coluna).toBe(0)
    expect(espelho?.linha).toBe(0)
  })
})
