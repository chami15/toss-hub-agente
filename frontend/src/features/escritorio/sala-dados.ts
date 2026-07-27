import type { Direcao, Paleta } from './sala'

// ---------------------------------------------------------------
// O FORMATO DA SALA
//
// A sala é DADO, não código. Mora em salas/*.json e é isso que o
// modo de edição lê e escreve. Antes a mobília era um array em
// mobilia.ts, o que amarrava "mudar a sala" a "mexer no código" — e
// gerar TypeScript de volta a partir do editor seria frágil (some
// comentário, formatação quebra, erro de sintaxe derruba o app).
// Serializar JSON nunca quebra o build, e sala nova = arquivo novo.
// ---------------------------------------------------------------

export interface MovelSala {
  // identidade estável — é por ela que `sobre` aponta e que o editor
  // sabe qual sprite mexer
  id: string
  peca: string
  direcao: Direcao
  coluna: number
  linha: number
  // altura acima do chão, em "andares" (1 = altura de parede). Uma
  // peça em cima da mesa fica por volta de 0.16.
  altura?: number
  // id do móvel que sustenta esta peça. Serve pra profundidade: o
  // objeto herda a do suporte e desenha na frente dele, o que mata a
  // classe de bug do "monitor sumiu atrás da própria mesa".
  sobre?: string
  // qual agente ocupa esta peça. A IDENTIDADE do agente não mora na
  // posição — mora aqui. Quem quer saber onde a Cifra está pergunta
  // pelo id e o índice devolve o móvel; quem clica num sprite lê este
  // campo. Assim o agente pode estar em qualquer móvel, em qualquer
  // sala, sem nada no código mudar.
  agente?: string
  // id da sala pra onde esta peça leva. Só vira "botão" clicável
  // quando aponta pra uma sala que existe de verdade (conferência
  // entre salas, em sala-conferir.ts) — sem isso é decoração comum,
  // igual qualquer outro móvel. Qualquer peça pode ter `leva`, não só
  // as que parecem porta: é o que permite passagem secreta atrás de
  // uma estante.
  leva?: string
}

export interface SalaDados {
  nome: string
  colunas: number
  linhas: number
  // baked, não uma referência a um preset — a sala é auto-contida:
  // abrir o arquivo mostra a cor de verdade, sem precisar cruzar com
  // outro lugar do código pra saber o que "corporativa" significa hoje
  paleta: Paleta
  moveis: MovelSala[]
}

// Resolve a cadeia de `sobre` até o móvel que está de fato no chão.
// O `visitados` evita laço infinito se alguém criar um ciclo à mão.
export function baseNoChao(movel: MovelSala, porId: Map<string, MovelSala>): MovelSala {
  const visitados = new Set<string>()
  let atual = movel
  while (atual.sobre && !visitados.has(atual.id)) {
    visitados.add(atual.id)
    const suporte = porId.get(atual.sobre)
    if (!suporte) break
    atual = suporte
  }
  return atual
}

// Quantos degraus acima do chão — usado pra desempatar profundidade
// entre a peça e o que a sustenta.
export function nivelDe(movel: MovelSala, porId: Map<string, MovelSala>): number {
  const visitados = new Set<string>()
  let nivel = 0
  let atual = movel
  while (atual.sobre && !visitados.has(atual.id)) {
    visitados.add(atual.id)
    const suporte = porId.get(atual.sobre)
    if (!suporte) break
    atual = suporte
    nivel++
  }
  return nivel
}

export function indexarPorId(moveis: MovelSala[]): Map<string, MovelSala> {
  return new Map(moveis.map((m) => [m.id, m]))
}

// Índice agente → móvel. É o que responde "onde está a Cifra?" pra
// desenhar crachá, balão de fala e animação. Agente que não está na
// sala simplesmente não aparece aqui, e nada quebra.
export function indexarPorAgente(moveis: MovelSala[]): Map<string, MovelSala> {
  const mapa = new Map<string, MovelSala>()
  for (const m of moveis) {
    if (m.agente) mapa.set(m.agente, m)
  }
  return mapa
}

// id novo pra peça recém-adicionada pelo catálogo, legível no JSON.
export function novoId(peca: string, existentes: Set<string>): string {
  let n = 1
  while (existentes.has(`${peca}-${n}`)) n++
  return `${peca}-${n}`
}

// A conferência mora em sala-conferir.ts, um arquivo sem imports —
// é usada também pelo plugin do Vite e pelos testes, que rodam com
// regras de módulo diferentes das do app.
export { conferirSala } from './sala-conferir'
