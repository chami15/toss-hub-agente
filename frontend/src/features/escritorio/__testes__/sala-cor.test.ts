import { describe, expect, it } from 'vitest'
import { gerarPaletaDeCor, hexParaHsl, hslParaHex, PALETAS } from '../sala'
import { CHAVES_PALETA } from '../sala-conferir'

// O gerador existe pro formulário "criar sala": em vez de 14 seletores
// de cor, o chefe escolhe UMA e o resto é derivado por HSL. O que se
// testa aqui não é "a cor exata bateu" (isso é gosto, não bug) — é que
// a ORDEM de tons continua fazendo sentido de sala pra qualquer cor de
// entrada, inclusive as extremas que quebrariam um gerador ingênuo.

describe('hexParaHsl / hslParaHex', () => {
  it('ida e volta preserva a cor', () => {
    for (const hex of [0xffffff, 0x000000, 0xd8d2c6, 0x336699, 0xff0000]) {
      const { h, s, l } = hexParaHsl(hex)
      expect(hslParaHex(h, s, l)).toBe(hex)
    }
  })
})

describe('gerarPaletaDeCor', () => {
  it('gera as 14 chaves, todas números', () => {
    const p = gerarPaletaDeCor('teste', 0x4a7c59)
    for (const chave of CHAVES_PALETA) {
      expect(typeof p[chave], chave).toBe('number')
    }
  })

  it('mantém a ordem clara→escuro que a paleta "neutra" (feita à mão) já tinha', () => {
    // é a mesma relação de luminosidade em qualquer matiz: piso mais
    // claro que junta, junta mais clara que laje, parede mais clara
    // que rodapé — senão a sala vira uma mancha sem profundidade
    for (const base of [0x4a7c59, 0x9b4d3f, 0x3f5f9b, 0xc9a577]) {
      const p = gerarPaletaDeCor('x', base)
      const l = (hex: number) => hexParaHsl(hex).l
      expect(l(p.pisoClaro)).toBeGreaterThan(l(p.pisoJunta))
      expect(l(p.pisoJunta)).toBeGreaterThan(l(p.lajeLado))
      expect(l(p.paredeTopo)).toBeGreaterThan(l(p.rodape))
      expect(l(p.janelaMoldura)).toBeGreaterThan(l(p.pisoClaro))
    }
  })

  it('não quebra com cor extrema: preto, branco, neon', () => {
    for (const base of [0x000000, 0xffffff, 0x00ff00, 0xff00ff]) {
      const p = gerarPaletaDeCor('extrema', base)
      for (const chave of CHAVES_PALETA) {
        expect(Number.isFinite(p[chave]), chave).toBe(true)
        expect(p[chave]).toBeGreaterThanOrEqual(0)
        expect(p[chave]).toBeLessThanOrEqual(0xffffff)
      }
    }
  })

  it('cores diferentes geram salas diferentes', () => {
    const verde = gerarPaletaDeCor('a', 0x4a7c59)
    const vermelho = gerarPaletaDeCor('a', 0x9b4d3f)
    expect(verde.pisoClaro).not.toBe(vermelho.pisoClaro)
  })

  it('o vidro da janela não muda com a cor da sala (é reflexo do céu)', () => {
    const verde = gerarPaletaDeCor('a', 0x4a7c59)
    const vermelho = gerarPaletaDeCor('a', 0x9b4d3f)
    expect(verde.janelaVidro).toBe(vermelho.janelaVidro)
  })
})

describe('presets existentes', () => {
  it('as 4 paletas prontas continuam com as 14 chaves', () => {
    for (const [nome, paleta] of Object.entries(PALETAS)) {
      for (const chave of CHAVES_PALETA) {
        expect(typeof paleta[chave], `${nome}.${chave}`).toBe('number')
      }
    }
  })
})
