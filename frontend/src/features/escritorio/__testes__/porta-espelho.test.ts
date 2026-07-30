import { beforeEach, describe, expect, it } from 'vitest'
import { criarPortaEspelhada, desvincularDoOutroLado, removerEspelhos } from '../porta-espelho'
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

  // Trocar coluna↔linha é um espelho HORIZONTAL na tela (x vira −x, y
  // não mexe), então a direção tem que sofrer a MESMA reflexão. Os
  // pares abaixo não vieram do nome "NE"/"NW" (que é rótulo do pack da
  // Kenney, não eixo da nossa grade): vieram de espelhar a silhueta de
  // cada sprite e ver com qual das outras três ela casa — 0,95–0,99 de
  // sobreposição, igual pra chairDesk, desk e computerScreen.
  it('reflete a direção junto com os eixos (espelho horizontal, não giro)', () => {
    const casos: [MovelSala['direcao'], MovelSala['direcao']][] = [
      ['NE', 'NW'],
      ['NW', 'NE'],
      ['SE', 'SW'],
      ['SW', 'SE'],
    ]
    for (const [de, esperada] of casos) {
      salvarRascunho('destino', { nome: 'Destino', colunas: 5, linhas: 5, paleta: {} as never, moveis: [] })
      criarPortaEspelhada('origem', { colunas: 5, linhas: 5 }, porta(0, 0, de), 'destino')
      expect(lerRascunho('destino')?.moveis[0].direcao).toBe(esperada)
    }
  })

  // Um giro de 180° (NE↔SE) deixaria a peça no MESMO plano de parede,
  // e era exatamente o bug: posição no lugar certo, peça atravessada.
  it('a reflexão troca o plano de parede — nunca é um giro de 180°', () => {
    const mesmoPlano: Record<MovelSala['direcao'], MovelSala['direcao']> = {
      NE: 'SE',
      SE: 'NE',
      NW: 'SW',
      SW: 'NW',
    }
    for (const de of ['NE', 'NW', 'SE', 'SW'] as const) {
      salvarRascunho('destino', { nome: 'Destino', colunas: 5, linhas: 5, paleta: {} as never, moveis: [] })
      criarPortaEspelhada('origem', { colunas: 5, linhas: 5 }, porta(0, 0, de), 'destino')
      const saiu = lerRascunho('destino')?.moveis[0].direcao
      expect(saiu).not.toBe(de)
      expect(saiu).not.toBe(mesmoPlano[de])
    }
  })

  it('devolve o id da peça criada, pra dar pra desfazer depois', () => {
    salvarRascunho('destino', { nome: 'Destino', colunas: 5, linhas: 5, paleta: {} as never, moveis: [] })
    const id = criarPortaEspelhada('origem', { colunas: 5, linhas: 5 }, porta(0, 0), 'destino')
    expect(lerRascunho('destino')?.moveis.map((m) => m.id)).toContain(id)
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

function semearDestino(moveis: MovelSala[]) {
  salvarRascunho('destino', { nome: 'Destino', colunas: 5, linhas: 5, paleta: {} as never, moveis })
}

// Desfazer o vínculo só de um lado deixava a outra porta apontando pra
// cá pra sempre — uma passagem de mão única. Como o par não é gravado
// em lugar nenhum (as duas peças são independentes, de propósito), a
// contrapartida é achada pela própria relação `leva`.
describe('desvincularDoOutroLado', () => {
  it('tira o leva da porta que voltava pra cá', () => {
    semearDestino([{ id: 'volta', peca: 'doorway', direcao: 'SW', coluna: 1, linha: 1, leva: 'origem' }])
    expect(desvincularDoOutroLado('origem', 'destino')).toBe('desfeito')
    expect(lerRascunho('destino')?.moveis[0].leva).toBeUndefined()
  })

  it('a peça continua existindo — some o vínculo, não a mobília', () => {
    semearDestino([{ id: 'volta', peca: 'doorway', direcao: 'SW', coluna: 1, linha: 1, leva: 'origem' }])
    desvincularDoOutroLado('origem', 'destino')
    const moveis = lerRascunho('destino')?.moveis ?? []
    expect(moveis).toHaveLength(1)
    expect(moveis[0].id).toBe('volta')
  })

  it('não mexe em portas que levam pra OUTRAS salas', () => {
    semearDestino([
      { id: 'volta', peca: 'doorway', direcao: 'SW', coluna: 1, linha: 1, leva: 'origem' },
      { id: 'outra', peca: 'doorway', direcao: 'NE', coluna: 2, linha: 2, leva: 'cozinha' },
    ])
    desvincularDoOutroLado('origem', 'destino')
    expect(lerRascunho('destino')?.moveis.find((m) => m.id === 'outra')?.leva).toBe('cozinha')
  })

  it('com mais de uma porta voltando, não escolhe no chute', () => {
    semearDestino([
      { id: 'a', peca: 'doorway', direcao: 'SW', coluna: 1, linha: 1, leva: 'origem' },
      { id: 'b', peca: 'doorway', direcao: 'NE', coluna: 2, linha: 2, leva: 'origem' },
    ])
    expect(desvincularDoOutroLado('origem', 'destino')).toBe('ambiguo')
    // e não desvinculou nenhuma das duas
    expect(lerRascunho('destino')?.moveis.every((m) => m.leva === 'origem')).toBe(true)
  })

  // aqui a sala de destino é uma de VERDADE, sem rascunho: é o caminho
  // que mais acontece na prática (o chefe nunca abriu aquela sala nesta
  // máquina), e o que faltava era não deixar rascunho pra trás à toa
  it('sem contrapartida nenhuma, não inventa rascunho', () => {
    expect(desvincularDoOutroLado('sala-que-nao-existe', 'escritorio')).toBe('nenhum')
    expect(lerRascunho('escritorio')).toBeNull()
  })

  it('funciona numa sala que só tem fonte, sem rascunho aberto', () => {
    expect(desvincularDoOutroLado('escritorio', 'sala-de-reuniao')).toBe('desfeito')
    expect(lerRascunho('sala-de-reuniao')?.moveis.some((m) => m.leva)).toBe(false)
  })
})

// "Descartar e voltar à fonte" apagava só o rascunho da sala aberta — a
// metade da porta que tinha nascido do outro lado sobrevivia, virando
// uma porta órfã numa sala que o chefe nem chegou a abrir.
describe('removerEspelhos', () => {
  it('apaga a peça que a sessão criou na outra sala', () => {
    semearDestino([])
    const id = criarPortaEspelhada('origem', { colunas: 5, linhas: 5 }, porta(2, 2), 'destino')
    removerEspelhos([{ sala: 'destino', id }])
    expect(lerRascunho('destino')?.moveis).toHaveLength(0)
  })

  it('não leva junto o que já estava na sala', () => {
    semearDestino([{ id: 'mesa', peca: 'desk', direcao: 'NE', coluna: 1, linha: 1 }])
    const id = criarPortaEspelhada('origem', { colunas: 5, linhas: 5 }, porta(2, 2), 'destino')
    removerEspelhos([{ sala: 'destino', id }])
    const moveis = lerRascunho('destino')?.moveis ?? []
    expect(moveis).toHaveLength(1)
    expect(moveis[0].id).toBe('mesa')
  })

  it('sala sem rascunho é deixada em paz (a peça já virou decisão do chefe)', () => {
    removerEspelhos([{ sala: 'destino', id: 'doorway-espelho-1' }])
    expect(lerRascunho('destino')).toBeNull()
  })
})
