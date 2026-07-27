import { describe, expect, it } from 'vitest'
import { slugificar } from '../PainelSalas'

// slugificar vira o nome que o chefe digita no id de arquivo que o
// servidor aceita (NOME_VALIDO em vite-plugin-salas.ts: minúsculo,
// letras/números/hífen, até 40 caracteres). Testado à parte do
// componente porque é a peça que decide se um nome vira arquivo válido
// ou é rejeitado silenciosamente ali na validação do formulário.

describe('slugificar', () => {
  it('minúsculas, espaço vira hífen', () => {
    expect(slugificar('Sala de Reunião')).toBe('sala-de-reuniao')
  })

  it('remove acento em vez de virar hífen', () => {
    // "ã"/"á" não são [a-z0-9]: sem a normalização NFD + remoção de
    // marca de acento, isso quebraria em hífen extra ou caractere
    // inválido em vez de virar a letra sem acento
    expect(slugificar('Cozinha')).toBe('cozinha')
    expect(slugificar('Área Comum')).toBe('area-comum')
  })

  it('símbolos viram hífen único, sem duplicar', () => {
    expect(slugificar('Sala!!  ##2')).toBe('sala-2')
  })

  it('sem hífen sobrando nas pontas', () => {
    expect(slugificar('  -Teste-  ')).toBe('teste')
  })

  it('nome só de símbolo vira string vazia — formulário tem que barrar isso', () => {
    expect(slugificar('!!!')).toBe('')
  })

  it('corta em 40 caracteres, igual ao servidor', () => {
    const longo = 'a'.repeat(60)
    expect(slugificar(longo).length).toBe(40)
  })
})
