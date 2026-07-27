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
  leva?: unknown
}

export interface SalaConferivel {
  colunas?: unknown
  linhas?: unknown
  paleta?: unknown
  moveis: MovelConferivel[]
}

// Só entra na conferência ENTRE salas (conferirConjuntoDeSalas) — a
// sala sozinha (conferirSala) não sabe o próprio id nem precisa saber
// o próprio nome pra se validar.
export interface SalaConferivelComNome extends SalaConferivel {
  nome?: unknown
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

    if (m.leva !== undefined && typeof m.leva !== 'string') {
      // valor certo mas tipo errado (número, objeto...) — a checagem
      // de sala de destino de verdade só dá pra fazer olhando o
      // conjunto inteiro (conferirConjuntoDeSalas), mas o TIPO já dá
      // pra pegar sozinho, sem precisar saber quais salas existem
      problemas.push(`"${m.id}" tem leva com tipo inválido: ${JSON.stringify(m.leva)}`)
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

// Defeitos que só existem olhando MAIS DE UMA sala ao mesmo tempo:
// nome de sala repetido, agente em duas salas diferentes, porta que
// leva pra uma sala que não existe (mais). conferirSala (acima) não
// pode pegar nenhum desses sozinha — ela nem sabe que outras salas
// existem.
//
// `salas` é um mapa id → sala, o mesmo formato que
// todasAsSalasDaFonte() já devolve no app, e que dá pra montar direto
// lendo os arquivos de salas/ (no plugin do Vite e nos testes).
export function conferirConjuntoDeSalas(salas: Record<string, SalaConferivelComNome>): string[] {
  const problemas: string[] = []
  const idsValidos = new Set(Object.keys(salas))
  const donoDoNome = new Map<string, string>()
  const donoDoAgente = new Map<string, string>()

  for (const [id, sala] of Object.entries(salas)) {
    if (typeof sala.nome === 'string') {
      const chave = sala.nome.trim().toLowerCase()
      const outroId = donoDoNome.get(chave)
      if (outroId) {
        // duas salas com o mesmo nome — o menu de troca (passo 5) não
        // teria como diferenciar uma da outra pro chefe
        problemas.push(`"${id}" e "${outroId}" têm o mesmo nome de sala ("${sala.nome}")`)
      } else {
        donoDoNome.set(chave, id)
      }
    }

    for (const m of sala.moveis) {
      if (m.agente !== undefined) {
        const chave = `${id}/${m.id}`
        const outro = donoDoAgente.get(m.agente)
        // duplicata DENTRO da mesma sala já é responsabilidade de
        // conferirSala — aqui só interessa quando são salas diferentes
        if (outro && outro.split('/')[0] !== id) {
          problemas.push(`o agente "${m.agente}" está em duas salas: "${outro}" e "${chave}"`)
        }
        if (!outro) donoDoAgente.set(m.agente, chave)
      }

      if (typeof m.leva === 'string') {
        if (m.leva === id) {
          // não é erro de digitação — é uma porta que leva pra dentro
          // da própria sala, o que não significa nada
          problemas.push(`"${m.id}" na sala "${id}" tem uma porta que leva pra ela mesma`)
        } else if (!idsValidos.has(m.leva)) {
          // sala apagada, ou nome digitado errado à mão — a peça
          // continua ali, mas não vira botão nenhum (só decoração)
          problemas.push(`"${m.id}" na sala "${id}" leva pra "${m.leva}", que não existe`)
        }
      }
    }
  }

  return [...new Set(problemas)]
}
