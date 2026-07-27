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
  moveis: MovelConferivel[]
}

// Defeitos que NÃO dão erro em lugar nenhum — a sala carrega, parece
// certa, e só está sutilmente errada. Todos vêm de edição à mão do
// arquivo; o modo de edição não produz nenhum deles.
//
// Não corrige nada de propósito: adivinhar a intenção de um dado
// torto é como se cria um problema pior que o original.
export function conferirSala(sala: SalaConferivel, agentesConhecidos: string[]): string[] {
  const problemas: string[] = []
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
