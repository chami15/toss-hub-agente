// Dados da sala — só dado, nenhum desenho.

export const COLUNAS = 7
export const LINHAS = 7

// Cor do vazio ao redor da maquete.
export const COR_FUNDO = 0x14161b

// Caminho dos sprites do pack (servidos direto de public/, sem passar
// pelo bundler — convenção do Vite pra asset estático).
export const PASTA_SPRITES = '/Isometric'

export type Direcao = 'NE' | 'NW' | 'SE' | 'SW'

export function caminhoSprite(peca: string, direcao: Direcao): string {
  return `${PASTA_SPRITES}/${peca}_${direcao}.png`
}
