// ---------------------------------------------------------------
// CONFERÊNCIA DA SALA
//
// Vive num arquivo SEM NENHUM import de propósito. É usado em três
// lugares com regras de módulo diferentes — o app (bundler), o plugin
// do Vite (nodenext) e os testes — e qualquer dependência transitiva
// aqui viraria briga de resolução de caminho em um deles.
//
// Os tipos são estruturais e mínimos: qualquer coisa com a forma de
// SalaDados serve, sem precisar importar SalaDados.
// ---------------------------------------------------------------

export interface MovelConferivel {
  id: string
  sobre?: string
  agente?: string
}

export interface SalaConferivel {
  colunas?: unknown
  linhas?: unknown
  paleta?: unknown
  moveis: MovelConferivel[]
}

// As 14 chaves de Paleta, repetidas aqui como dado (não como import de
// tipo — isto tem que continuar sem imports). Se a interface Paleta
// ganhar um campo novo, esta lista precisa acompanhar. Exportada pra
// cena.ts reusar na hora de decidir o fallback de uma paleta inválida.
export const CHAVES_PALETA = [
  'vazio',
  'pisoClaro',
  'pisoEscuro',
  'pisoJunta',
  'lajeFrente',
  'lajeLado',
  'paredeEsquerda',
  'paredeDireita',
  'paredeTopo',
  'rodape',
  'janelaMoldura',
  'janelaVidro',
  'janelaVidroBase',
  'janelaBrilho',
] as const

// Apoiar `idPeca` em `idSuporte` fecharia um ciclo?
//
// Existe pra impedir o defeito NA ORIGEM, e não só denunciar depois.
// Hoje o editor já não consegue criar ciclo, mas por acidente: ele só
// oferece como suporte peças que estão no chão. No dia em que empilhar
// mais de um nível for permitido, essa proteção sumiria em silêncio —
// então a regra mora aqui, junto do dado, e não na interface.
export function criariaCiclo(
  idPeca: string,
  idSuporte: string,
  moveis: MovelConferivel[],
): boolean {
  if (idPeca === idSuporte) return true
  const porId = new Map(moveis.map((m) => [m.id, m]))
  const visitados = new Set<string>()
  // sobe a cadeia a partir do suporte: se ela leva de volta à própria
  // peça, apoiar fecharia o laço
  let atual = porId.get(idSuporte)
  while (atual) {
    if (atual.id === idPeca) return true
    if (visitados.has(atual.id)) return true // já havia ciclo antes
    visitados.add(atual.id)
    atual = atual.sobre === undefined ? undefined : porId.get(atual.sobre)
  }
  return false
}

// Defeitos que NÃO dão erro em lugar nenhum — a sala carrega, parece
// certa, e só está sutilmente errada. Todos vêm de edição à mão do
// arquivo; o modo de edição não produz nenhum deles.
//
// Não corrige nada de propósito: adivinhar a intenção de um dado
// torto é como se cria um problema pior que o original.
export function conferirSala(sala: SalaConferivel, agentesConhecidos: string[]): string[] {
  const problemas: string[] = []

  // Tamanho e cor eram constantes globais até pouco tempo atrás — o
  // JSON já dizia "colunas: 10" numa sala que continuava desenhando
  // 7×7, porque nada lia esse campo. Agora que leem, um valor ausente
  // ou zerado quebra silenciosamente do mesmo jeito (piso de tamanho
  // 0, ou undefined virando NaN na conta de posição).
  if (typeof sala.colunas !== 'number' || !(sala.colunas > 0)) {
    problemas.push(`colunas inválido: ${JSON.stringify(sala.colunas)}`)
  }
  if (typeof sala.linhas !== 'number' || !(sala.linhas > 0)) {
    problemas.push(`linhas inválido: ${JSON.stringify(sala.linhas)}`)
  }

  if (typeof sala.paleta !== 'object' || sala.paleta === null) {
    problemas.push('sala sem paleta — piso e paredes não têm cor pra desenhar')
  } else {
    const paleta = sala.paleta as Record<string, unknown>
    const faltando = CHAVES_PALETA.filter((chave) => typeof paleta[chave] !== 'number')
    if (faltando.length > 0) {
      // cada tom faltando é um Graphics.fill(undefined) — em alguns
      // casos isso pinta preto sem avisar, em outros nem desenha
      problemas.push(`paleta incompleta: faltando ${faltando.join(', ')}`)
    }
  }

  const vistos = new Set<string>()
  const ids = new Set(sala.moveis.map((m) => m.id))
  const donoDoAgente = new Map<string, string>()

  for (const m of sala.moveis) {
    if (vistos.has(m.id)) {
      // o índice é um Map: o segundo apaga o primeiro e sobra um
      // sprite que ninguém mais consegue selecionar nem mover
      problemas.push(`id repetido: "${m.id}" — um dos dois vira sprite órfão`)
    }
    vistos.add(m.id)

    if (m.sobre === m.id) {
      problemas.push(`"${m.id}" está apoiado em si mesmo`)
    } else if (m.sobre !== undefined && !ids.has(m.sobre)) {
      // baseNoChao devolve a própria peça, e a profundidade dela fica
      // errada em silêncio — pode desenhar atrás do que deveria cobrir
      problemas.push(`"${m.id}" está apoiado em "${m.sobre}", que não existe`)
    }

    if (m.agente !== undefined) {
      if (!agentesConhecidos.includes(m.agente)) {
        // redesenharAgentes simplesmente pula: o crachá não aparece e
        // nada explica por quê
        problemas.push(`"${m.id}" tem o agente "${m.agente}", que não existe`)
      }
      const outro = donoDoAgente.get(m.agente)
      if (outro) {
        // o índice por agente também é um Map: um dos dois crachás
        // some sem aviso
        problemas.push(`o agente "${m.agente}" está em duas peças: "${outro}" e "${m.id}"`)
      } else {
        donoDoAgente.set(m.agente, m.id)
      }
    }
  }

  // Ciclo de apoio (A sobre B, B sobre A): baseNoChao e nivelDe param
  // pelo controle de visitados, então não travam — mas a profundidade
  // vira arbitrária, dependendo de qual peça foi consultada primeiro.
  const porId = new Map(sala.moveis.map((m) => [m.id, m]))
  for (const m of sala.moveis) {
    // apoio em si mesmo já foi relatado acima, e com mensagem mais
    // clara — não vale contar de novo como "ciclo"
    if (m.sobre === m.id) continue
    const visitados = new Set<string>()
    let atual: MovelConferivel | undefined = m
    while (atual?.sobre !== undefined) {
      if (visitados.has(atual.id)) {
        problemas.push(`ciclo de apoio envolvendo "${m.id}"`)
        break
      }
      visitados.add(atual.id)
      atual = porId.get(atual.sobre)
    }
  }

  return [...new Set(problemas)]
}
