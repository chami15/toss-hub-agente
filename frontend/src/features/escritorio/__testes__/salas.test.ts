import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { conferirSala } from '../sala-conferir'
import { AGENTES } from '../agentes'
import { ANCORAS } from '../ancoras'
import type { SalaDados } from '../sala-dados'

// ---------------------------------------------------------------
// O teste que mais importa pro medo de "erro silencioso que uma hora
// explode": percorre TODOS os arquivos de sala versionados e prova que
// cada um é coerente com o resto do projeto.
//
// Se alguém editar um JSON à mão e errar, isso quebra no `npm test`,
// antes de virar um móvel misteriosamente no lugar errado semanas
// depois. Vale pras salas que existem hoje e pras que vierem — o
// teste descobre os arquivos sozinho.
// ---------------------------------------------------------------

const PASTA_SALAS = resolve(__dirname, '../salas')
const PASTA_SPRITES = resolve(__dirname, '../../../../public/Isometric')
const DIRECOES = ['NE', 'NW', 'SE', 'SW'] as const

const arquivos = readdirSync(PASTA_SALAS).filter((f) => f.endsWith('.json'))

function lerSala(arquivo: string): SalaDados {
  return JSON.parse(readFileSync(resolve(PASTA_SALAS, arquivo), 'utf8')) as SalaDados
}

it('existe pelo menos uma sala', () => {
  // se a pasta esvaziar por acidente, os testes abaixo passariam
  // vazios e ninguém perceberia
  expect(arquivos.length).toBeGreaterThan(0)
})

describe.each(arquivos)('sala %s', (arquivo) => {
  const sala = lerSala(arquivo)

  it('não tem defeito silencioso', () => {
    expect(conferirSala(sala, AGENTES.map((a) => a.id))).toEqual([])
  })

  it('tem os campos obrigatórios', () => {
    expect(typeof sala.nome).toBe('string')
    expect(sala.colunas).toBeGreaterThan(0)
    expect(sala.linhas).toBeGreaterThan(0)
    expect(Array.isArray(sala.moveis)).toBe(true)
  })

  it('só usa peças que existem no pack', () => {
    // peça inventada = textura que não carrega = cena não monta
    const faltando = sala.moveis
      .filter((m) => !existsSync(resolve(PASTA_SPRITES, `${m.peca}_${m.direcao}.png`)))
      .map((m) => `${m.id} (${m.peca}_${m.direcao})`)
    expect(faltando).toEqual([])
  })

  it('só usa peças que têm âncora medida', () => {
    // sem âncora a peça cai no palpite padrão e fica flutuando ou
    // afundada, sem nada indicar o motivo
    const semAncora = sala.moveis
      .filter((m) => !(`${m.peca}_${m.direcao}` in ANCORAS))
      .map((m) => m.id)
    expect(semAncora).toEqual([])
  })

  it('usa direções válidas', () => {
    const invalidas = sala.moveis
      .filter((m) => !DIRECOES.includes(m.direcao))
      .map((m) => `${m.id} (${m.direcao})`)
    expect(invalidas).toEqual([])
  })

  it('não tem coordenada quebrada', () => {
    for (const m of sala.moveis) {
      expect(Number.isFinite(m.coluna), `${m.id}.coluna`).toBe(true)
      expect(Number.isFinite(m.linha), `${m.id}.linha`).toBe(true)
      if (m.altura !== undefined) {
        expect(Number.isFinite(m.altura), `${m.id}.altura`).toBe(true)
      }
    }
  })
})
