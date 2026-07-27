import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATEGORIAS, PECAS, categoriaDe, pecasDaCategoria } from '../catalogo'
import { ANCORAS } from '../ancoras'

// O catálogo é uma lista escrita à mão apontando pra arquivos e pra
// âncoras geradas. Nada garante que os três continuem casados — e o
// sintoma de um descasamento é uma peça que some ou flutua ao ser
// adicionada, sem erro nenhum.

const PASTA_SPRITES = resolve(__dirname, '../../../../public/Isometric')
const DIRECOES = ['NE', 'NW', 'SE', 'SW'] as const

const noDisco = [
  ...new Set(
    readdirSync(PASTA_SPRITES)
      .filter((f) => f.endsWith('.png'))
      .map((f) => f.replace(/_(NE|NW|SE|SW)\.png$/, '')),
  ),
].sort()

describe('catálogo x arquivos do pack', () => {
  it('lista exatamente as peças que existem no disco', () => {
    // pega os dois lados: peça listada que não existe (quebra ao
    // adicionar) e peça do pack que ninguém consegue usar
    expect([...PECAS].sort()).toEqual(noDisco)
  })

  it('toda peça tem as 4 direções em arquivo', () => {
    const incompletas = PECAS.filter((p) =>
      DIRECOES.some((d) => !existsSync(resolve(PASTA_SPRITES, `${p}_${d}.png`))),
    )
    // girar troca a textura: faltando uma direção, girar some com a peça
    expect(incompletas).toEqual([])
  })

  it('toda peça tem âncora nas 4 direções', () => {
    const semAncora = PECAS.filter((p) => DIRECOES.some((d) => !(`${p}_${d}` in ANCORAS)))
    expect(semAncora).toEqual([])
  })
})

describe('categorias', () => {
  it('toda peça cai em alguma categoria', () => {
    expect(PECAS.filter((p) => !categoriaDe(p))).toEqual([])
  })

  it('nenhuma peça fica fora do catálogo visível', () => {
    // se uma peça só existisse numa categoria vazia (que a interface
    // esconde), ela seria inalcançável
    const visiveis = new Set(
      CATEGORIAS.flatMap((c) => (pecasDaCategoria(c.id).length > 0 ? pecasDaCategoria(c.id) : [])),
    )
    expect(PECAS.filter((p) => !visiveis.has(p))).toEqual([])
  })

  it('cada peça aparece em uma categoria só', () => {
    const repetidas = PECAS.filter(
      (p) => CATEGORIAS.filter((c) => pecasDaCategoria(c.id).includes(p)).length !== 1,
    )
    expect(repetidas).toEqual([])
  })
})

describe('âncoras', () => {
  it('estão todas dentro do sprite', () => {
    // fração fora de 0..1 significa âncora fora da imagem: a peça
    // aparece deslocada do ponto onde deveria encostar
    const fora = Object.entries(ANCORAS).filter(
      ([, a]) => a.x < 0 || a.x > 1 || a.y < 0 || a.y > 1,
    )
    expect(fora).toEqual([])
  })

  it('cobrem todas as combinações peça × direção', () => {
    expect(Object.keys(ANCORAS)).toHaveLength(noDisco.length * DIRECOES.length)
  })
})
