// Entity/FurnitureSprite — os dados de cada mesa (posição no grid,
// papel, tamanho). De novo: só dado. O formato "+": a mesa do
// chefe/usuário no centro (maior) e uma mesa de agente em cada direção
// (norte/sul/leste/oeste).
export interface Mesa {
  id: string
  papel: 'chefe' | 'agente'
  coluna: number // centro da mesa no grid (pode ser fracionário)
  linha: number
  raio: number // metade do tamanho do tampo, em tiles
}

export const MESAS: Mesa[] = [
  { id: 'chefe', papel: 'chefe', coluna: 4.5, linha: 4.5, raio: 1 },
  { id: 'norte', papel: 'agente', coluna: 4.5, linha: 2, raio: 0.55 },
  { id: 'sul', papel: 'agente', coluna: 4.5, linha: 7, raio: 0.55 },
  { id: 'leste', papel: 'agente', coluna: 7, linha: 4.5, raio: 0.55 },
  { id: 'oeste', papel: 'agente', coluna: 2, linha: 4.5, raio: 0.55 },
]

// Chave de profundidade pra depth-sorting (z-ordering): quanto maior
// coluna+linha, mais "na frente" da sala o objeto está, e por isso
// precisa ser desenhado por último (sobrepondo o que está atrás).
export function profundidade(mesa: Mesa): number {
  return mesa.coluna + mesa.linha
}
