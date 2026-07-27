import { describe, expect, it } from 'vitest'
import { conferirSala, criariaCiclo } from '../sala-conferir'

// A conferência é a rede que pega os defeitos silenciosos. Se ELA
// tiver um furo, o furo é invisível por definição — por isso cada
// defeito tem um teste que prova que é pego, e há um teste provando
// que uma sala boa não gera alarme falso (senão a gente aprende a
// ignorar o aviso, que é o mesmo que não ter aviso).

const AGENTES = ['cifra', 'agenda']

function sala(moveis: { id: string; sobre?: string; agente?: string }[]) {
  return { moveis }
}

describe('conferirSala', () => {
  it('não reclama de uma sala correta', () => {
    const s = sala([
      { id: 'mesa' },
      { id: 'monitor', sobre: 'mesa' },
      { id: 'cadeira', agente: 'cifra' },
    ])
    expect(conferirSala(s, AGENTES)).toEqual([])
  })

  it('pega id repetido', () => {
    const s = sala([{ id: 'mesa' }, { id: 'mesa' }])
    expect(conferirSala(s, AGENTES)).toEqual([expect.stringContaining('id repetido')])
  })

  it('pega apoio em peça que não existe', () => {
    const s = sala([{ id: 'lampada', sobre: 'mesa-fantasma' }])
    expect(conferirSala(s, AGENTES)).toEqual([
      expect.stringContaining('mesa-fantasma'),
    ])
  })

  it('pega peça apoiada em si mesma', () => {
    const s = sala([{ id: 'mesa', sobre: 'mesa' }])
    expect(conferirSala(s, AGENTES)).toEqual([
      expect.stringContaining('apoiado em si mesmo'),
    ])
  })

  it('pega agente desconhecido', () => {
    const s = sala([{ id: 'cadeira', agente: 'fantasma' }])
    expect(conferirSala(s, AGENTES)).toEqual([expect.stringContaining('fantasma')])
  })

  it('pega o mesmo agente em duas peças', () => {
    // o índice por agente é um Map: um dos dois crachás sumiria sem
    // nada explicar
    const s = sala([
      { id: 'cadeira-a', agente: 'cifra' },
      { id: 'cadeira-b', agente: 'cifra' },
    ])
    expect(conferirSala(s, AGENTES)).toEqual([expect.stringContaining('duas peças')])
  })

  it('pega ciclo de apoio', () => {
    // A sobre B e B sobre A: não trava (há controle de visitados), mas
    // a profundidade vira arbitrária
    const s = sala([
      { id: 'a', sobre: 'b' },
      { id: 'b', sobre: 'a' },
    ])
    expect(conferirSala(s, AGENTES)).toEqual([
      expect.stringContaining('ciclo'),
      expect.stringContaining('ciclo'),
    ])
  })

  it('termina mesmo com cadeia longa de apoios', () => {
    const moveis = Array.from({ length: 200 }, (_, i) => ({
      id: `p${i}`,
      ...(i > 0 ? { sobre: `p${i - 1}` } : {}),
    }))
    expect(conferirSala(sala(moveis), AGENTES)).toEqual([])
  })

  it('acha vários defeitos de uma vez', () => {
    const s = sala([
      { id: 'a' },
      { id: 'a' },
      { id: 'b', sobre: 'nao-existe' },
      { id: 'c', agente: 'fantasma' },
    ])
    expect(conferirSala(s, AGENTES)).toHaveLength(3)
  })
})

// A guarda que impede o ciclo NA ORIGEM. Vale testar o caso de
// empilhamento profundo mesmo ele não sendo possível pela interface de
// hoje: a proteção atual do editor (só oferecer suporte que está no
// chão) é acidental, e o dia em que ela mudar é justamente o dia em
// que ninguém vai lembrar de conferir isto.
describe('criariaCiclo', () => {
  const empilhado = [
    { id: 'mesa' },
    { id: 'estrado', sobre: 'mesa' },
    { id: 'abajur', sobre: 'estrado' },
  ]

  it('deixa apoiar numa peça que está no chão', () => {
    expect(criariaCiclo('abajur', 'mesa', [{ id: 'mesa' }, { id: 'abajur' }])).toBe(false)
  })

  it('deixa empilhar mais de um nível', () => {
    expect(criariaCiclo('livro', 'abajur', [...empilhado, { id: 'livro' }])).toBe(false)
  })

  it('barra apoiar em si mesmo', () => {
    expect(criariaCiclo('mesa', 'mesa', empilhado)).toBe(true)
  })

  it('barra o laço curto (A sobre B, B sobre A)', () => {
    expect(criariaCiclo('mesa', 'estrado', empilhado)).toBe(true)
  })

  it('barra o laço longo (fechar uma cadeia de 3)', () => {
    expect(criariaCiclo('mesa', 'abajur', empilhado)).toBe(true)
  })

  it('não trava se a sala JÁ tiver um ciclo', () => {
    const doente = [
      { id: 'a', sobre: 'b' },
      { id: 'b', sobre: 'a' },
      { id: 'c' },
    ]
    expect(criariaCiclo('c', 'a', doente)).toBe(true)
  })

  it('aceita suporte que não existe (quem barra isso é conferirSala)', () => {
    expect(criariaCiclo('a', 'fantasma', [{ id: 'a' }])).toBe(false)
  })
})
