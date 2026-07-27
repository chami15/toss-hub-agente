import type { Direcao } from './sala'

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
}

export interface SalaDados {
  nome: string
  colunas: number
  linhas: number
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

// Problemas que o JSON pode ter e que NÃO dão erro em lugar nenhum —
// a sala carrega, parece certa, e só está sutilmente errada. Todos
// vêm de edição à mão do arquivo; o editor não produz nenhum deles.
// Não corrige nada de propósito: adivinhar a intenção seria pior que
// avisar e deixar o chefe decidir.
export function conferirSala(sala: SalaDados, agentesConhecidos: string[]): string[] {
  const problemas: string[] = []
  const vistos = new Set<string>()
  const ids = new Set(sala.moveis.map((m) => m.id))

  for (const m of sala.moveis) {
    if (vistos.has(m.id)) {
      // o índice é um Map: o segundo apaga o primeiro e sobra um
      // sprite que ninguém mais consegue selecionar nem mover
      problemas.push(`id repetido: "${m.id}" — um dos dois vira sprite órfão`)
    }
    vistos.add(m.id)

    if (m.sobre && !ids.has(m.sobre)) {
      // baseNoChao devolve a própria peça, e a profundidade dela fica
      // errada em silêncio — pode desenhar atrás do que deveria cobrir
      problemas.push(`"${m.id}" está apoiado em "${m.sobre}", que não existe`)
    }
    if (m.sobre === m.id) {
      problemas.push(`"${m.id}" está apoiado em si mesmo`)
    }
    if (m.agente && !agentesConhecidos.includes(m.agente)) {
      // redesenharAgentes simplesmente pula: o crachá não aparece e
      // nada explica por quê
      problemas.push(`"${m.id}" tem o agente "${m.agente}", que não existe`)
    }
  }
  return problemas
}
