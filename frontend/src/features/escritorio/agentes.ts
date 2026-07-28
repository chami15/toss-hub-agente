// Dado visual de cada agente: o retrato (fornecido pelo chefe, arte
// própria) e a cor de identidade (a mesma que já existe no backend,
// em `avatar_config.cor`). Só dado — quem desenha é cena.ts.
export interface AgenteVisual {
  id: string
  nome: string
  cor: number
  arquivo: string
  // Com qual agente do BACKEND este crachá corresponde.
  //
  // O agente do backend tem id NUMÉRICO (GET /agentes), que não tem
  // relação nenhuma com o id string daqui — a única chave que liga os
  // dois é a especialidade. Declarar isso no próprio registro (em vez
  // de uma tabela de-para solta) deixa a ponte visível pra quem lê, e
  // impossível de esquecer ao adicionar um agente novo.
  especialidade: string
  // O que o agente FAZ, em português, pra barra do painel. Separado da
  // especialidade de propósito: aquela é chave de junção (tem que bater
  // com o banco), esta é texto de tela — mostrar "agenda" embaixo do
  // nome "Agenda" não informaria nada a ninguém.
  funcao: string
}

export const PASTA_AGENTES = '/agentes'

export const AGENTES: AgenteVisual[] = [
  {
    id: 'cifra',
    nome: 'Cifra',
    cor: 0x16a34a,
    arquivo: 'cifra2dSemfundo.png',
    especialidade: 'financeiro',
    funcao: 'finanças e extratos',
  },
  {
    id: 'agenda',
    nome: 'Agenda',
    cor: 0x2563eb,
    arquivo: 'agenda2dSemfundo.png',
    especialidade: 'agenda',
    funcao: 'compromissos e calendário',
  },
  {
    id: 'vita',
    nome: 'Vita',
    cor: 0xf97316,
    arquivo: 'vita2dSemfundo.png',
    especialidade: 'saude',
    funcao: 'saúde e rotina',
  },
  {
    id: 'norte',
    nome: 'Norte',
    cor: 0x0891b2,
    arquivo: 'norte2dSemfundo.png',
    especialidade: 'norte',
    funcao: 'projetos e código',
  },
]

// Recorte circular do retrato de cada agente: centro (fração da
// imagem original) + raio (fração da LARGURA da imagem). Calibrado
// olhando cada retrato — os 4 têm enquadramento levemente diferente,
// então não dá pra usar um valor único pra todos.
export interface RecorteRetrato {
  cx: number
  cy: number
  raio: number
}

export const RECORTES: Record<string, RecorteRetrato> = {
  // cy MAIOR sobe o rosto dentro do círculo (ancora um ponto mais pra
  // baixo da imagem original no centro do crachá, empurrando o rosto,
  // que fica acima desse ponto, pra cima)
  cifra: { cx: 0.49, cy: 0.4, raio: 0.34 },
  agenda: { cx: 0.48, cy: 0.35, raio: 0.36 },
  vita: { cx: 0.5, cy: 0.37, raio: 0.38 },
  norte: { cx: 0.5, cy: 0.36, raio: 0.34 },
}
