// Mapeamento VISUAL: qual mesa (campo `agente.mesa`, que vem do banco)
// fica em qual posição da planta. Isto é SÓ apresentação — não é dado de
// negócio. Adicionar o 5º agente no futuro = adicionar uma linha aqui
// (box 1) + garantir que o Escritorio desenha o box 1. Nenhum componente
// muda.
//
// Dentro de um box de 4 mesas (formato "+"):
//   linha 0 = fileira de cima  (cadeira/pessoa virada pra cima, olhando pra baixo)
//   linha 1 = fileira de baixo (cadeira/pessoa virada pra baixo, olhando pra cima)
//   coluna 0 = esquerda, coluna 1 = direita

export interface PosicaoMesa {
  box: number
  linha: 0 | 1
  coluna: 0 | 1
}

export const LAYOUT_MESAS: Record<number, PosicaoMesa> = {
  1: { box: 0, linha: 0, coluna: 0 }, // Cifra
  2: { box: 0, linha: 0, coluna: 1 }, // Agenda
  3: { box: 0, linha: 1, coluna: 0 }, // Vita
  4: { box: 0, linha: 1, coluna: 1 }, // Norte
}

// Quantos boxes a planta desenha hoje. Já deixamos espaço reservado pro
// próximo box (5º agente em diante) sem precisar reescrever o layout.
export const TOTAL_BOXES = 1
