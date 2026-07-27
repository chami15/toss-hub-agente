import { beforeEach, describe, expect, it } from 'vitest'
import {
  carregarSala,
  definirSalaAtual,
  descartarRascunho,
  existeSala,
  idSalaAtual,
  idsDasSalas,
  lerRascunho,
  salaDaFonte,
  salvarRascunho,
  temRascunho,
  todasAsSalasDaFonte,
} from '../persistencia'

// A persistência é onde "múltiplas salas" pode quebrar de um jeito
// bem silencioso: rascunho de uma sala vazando pra outra, ou a sala
// errada carregando depois de um reload. Roda em ambiente Node — sem
// DOM de verdade —, então localStorage é um fake simples aqui embaixo.
// import.meta.glob funciona porque o Vitest processa os arquivos pelo
// mesmo pipeline do Vite, e é isso que este arquivo prova de graça:
// se a descoberta automática quebrasse, ESTE teste nem carregaria.

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
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageFalso(),
    configurable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: localStorageFalso(),
    configurable: true,
  })
})

describe('descoberta automática', () => {
  it('acha a sala real do projeto', () => {
    expect(idsDasSalas()).toContain('escritorio')
  })

  it('existeSala reflete o que foi descoberto', () => {
    expect(existeSala('escritorio')).toBe(true)
    expect(existeSala('sala-que-nao-existe')).toBe(false)
  })

  it('salaDaFonte devolve uma CÓPIA — mutar o resultado não vaza pro próximo caso', () => {
    const a = salaDaFonte('escritorio')
    a.moveis.push({ id: 'invasor', peca: 'trashcan', direcao: 'NE', coluna: 0, linha: 0 })
    const b = salaDaFonte('escritorio')
    expect(b.moveis.some((m) => m.id === 'invasor')).toBe(false)
  })

  it('todasAsSalasDaFonte inclui a sala real e também são cópias', () => {
    const todas = todasAsSalasDaFonte()
    expect(todas.escritorio).toBeDefined()
    todas.escritorio.nome = 'MUTADO'
    expect(salaDaFonte('escritorio').nome).not.toBe('MUTADO')
  })

  it('salaDaFonte reclama de sala que não existe em vez de devolver undefined', () => {
    // undefined silencioso levaria a "Cannot read properties of
    // undefined" em algum lugar bem mais longe do erro real
    expect(() => salaDaFonte('sala-fantasma')).toThrow(/não existe/)
  })
})

describe('sala atual', () => {
  it('cai na sala "escritorio" por padrão', () => {
    expect(idSalaAtual()).toBe('escritorio')
  })

  it('ignora um id salvo que não existe mais (sala apagada)', () => {
    definirSalaAtual('sala-que-foi-apagada')
    expect(idSalaAtual()).toBe('escritorio')
  })
})

describe('rascunho — isolado por sala', () => {
  it('não tem rascunho no começo', () => {
    expect(temRascunho('escritorio')).toBe(false)
    expect(lerRascunho('escritorio')).toBeNull()
  })

  it('salva e lê de volta', () => {
    const sala = salaDaFonte('escritorio')
    sala.nome = 'Editado'
    salvarRascunho('escritorio', sala)
    expect(temRascunho('escritorio')).toBe(true)
    expect(lerRascunho('escritorio')?.nome).toBe('Editado')
  })

  it('rascunho de UMA sala não aparece em outra', () => {
    const sala = salaDaFonte('escritorio')
    salvarRascunho('escritorio', sala)
    // "cozinha" nem precisa existir de verdade em salas/ pra este
    // teste — lerRascunho só olha o localStorage, não o disco
    expect(temRascunho('cozinha')).toBe(false)
    expect(lerRascunho('cozinha')).toBeNull()
  })

  it('descartar uma sala não mexe na outra', () => {
    const sala = salaDaFonte('escritorio')
    salvarRascunho('escritorio', sala)
    salvarRascunho('cozinha', sala)
    descartarRascunho('escritorio')
    expect(temRascunho('escritorio')).toBe(false)
    expect(temRascunho('cozinha')).toBe(true)
  })

  it('rascunho corrompido não derruba o app — cai como se não existisse', () => {
    localStorage.setItem('escritorio:rascunho:v2:escritorio', '{ isso não é json')
    expect(lerRascunho('escritorio')).toBeNull()
  })
})

describe('carregarSala', () => {
  it('sem rascunho, carrega da fonte', () => {
    const { sala, camada, idSala } = carregarSala()
    expect(camada).toBe('fonte')
    expect(idSala).toBe('escritorio')
    expect(sala.moveis.length).toBeGreaterThan(0)
  })

  it('com rascunho salvo, carrega o rascunho', () => {
    const sala = salaDaFonte('escritorio')
    sala.nome = 'Rascunho Ativo'
    salvarRascunho('escritorio', sala)
    const carregado = carregarSala()
    expect(carregado.camada).toBe('rascunho')
    expect(carregado.sala.nome).toBe('Rascunho Ativo')
  })
})
