// Dado visual de cada agente: o retrato (fornecido pelo chefe, arte
// própria) e a cor de identidade (a mesma que já existe no backend,
// em `avatar_config.cor`). Só dado — quem desenha é cena.ts.
export interface AgenteVisual {
  id: string
  nome: string
  cor: number
  arquivo: string
}

export const PASTA_AGENTES = '/agentes'

export const AGENTES: AgenteVisual[] = [
  { id: 'cifra', nome: 'Cifra', cor: 0x16a34a, arquivo: 'cifra2dSemfundo.png' },
  { id: 'agenda', nome: 'Agenda', cor: 0x2563eb, arquivo: 'agenda2dSemfundo.png' },
  { id: 'vita', nome: 'Vita', cor: 0xf97316, arquivo: 'vita2dSemfundo.png' },
  { id: 'norte', nome: 'Norte', cor: 0x0891b2, arquivo: 'norte2dSemfundo.png' },
]
