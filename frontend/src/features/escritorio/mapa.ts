// Planta do escritório: um "L" com o saguão maior (esquerda/frente) e
// o lounge menor (direita/fundo), inspirado na referência clássica do
// Habbo Hotel. Isso é DADO, não visual — Piso.tsx e Parede.tsx só leem
// daqui. Editar a planta = editar essa matriz, nenhum componente muda.
//
// null = fora da planta (mostra o fundo preto ali, é o "recorte" que
// forma o L).
export type ZonaPiso = 'saguao' | 'lounge' | null

export const MAPA_PISO: ZonaPiso[][] = [
  [null, null, null, 'saguao', 'saguao', 'saguao', 'lounge', 'lounge', 'lounge'],
  [null, null, null, 'saguao', 'saguao', 'saguao', 'lounge', 'lounge', 'lounge'],
  [null, null, null, 'saguao', 'saguao', 'saguao', 'lounge', 'lounge', 'lounge'],
  ['saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao'],
  ['saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao'],
  ['saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao'],
  ['saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao'],
  ['saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao', 'saguao'],
]

// Segmentos de parede de fundo — as bordas do "L" que ficam expostas
// pro vazio (fundo preto). Derivados à mão da planta acima; 'norte'
// varia coluna com linha fixa (a parede corre na direção coluna),
// 'oeste' varia linha com coluna fixa.
export interface ParedeSegmento {
  tipo: 'norte' | 'oeste'
  fixo: number
  de: number
  ate: number
  zona: 'saguao' | 'lounge'
}

export const PAREDES: ParedeSegmento[] = [
  { tipo: 'norte', fixo: 3, de: 0, ate: 3, zona: 'saguao' }, // topo das colunas 0-2 (onde encontram o L)
  { tipo: 'norte', fixo: 0, de: 3, ate: 6, zona: 'saguao' }, // topo do corredor
  { tipo: 'norte', fixo: 0, de: 6, ate: 9, zona: 'lounge' }, // topo do lounge
  { tipo: 'oeste', fixo: 3, de: 0, ate: 3, zona: 'saguao' }, // lateral oeste do corredor
  { tipo: 'oeste', fixo: 0, de: 3, ate: 8, zona: 'saguao' }, // lateral oeste do saguão
]
