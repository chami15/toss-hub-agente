import { lazy, Suspense } from 'react'
import { AGENTES } from '../escritorio/agentes'
import { useAgentes } from '../../hooks/useAgentes'
import { PainelAgente, type LarguraPainel } from './PainelAgente'
import { EsqueletoPainel } from './EsqueletoPainel'

// Escolhe QUAL painel abrir pra cada agente. Existe porque não há um
// "painel genérico" que sirva pros quatro (ver frontend-design.md): o
// conteúdo é chat, dashboard, menu de forms ou card — coisas sem nada
// em comum além da moldura.
//
// Cada painel é seu próprio chunk (`lazy`), baixado só quando o chefe
// abre aquele agente — o Cifra sozinho carrega os gráficos (graficos.tsx)
// que os outros três nunca usam, então sem isso todo mundo pagava o
// bundle de todo mundo desde o primeiro carregamento da página. O
// Suspense fica só em volta do CONTEÚDO (children de PainelAgente):
// a moldura (retrato, nome, estado, botão de fechar) aparece na hora,
// o esqueleto ocupa só o espaço de baixo enquanto o chunk chega.
const PainelAgenda = lazy(() => import('../agenda/PainelAgenda').then((m) => ({ default: m.PainelAgenda })))
const PainelFinanceiro = lazy(() =>
  import('../financeiro/PainelFinanceiro').then((m) => ({ default: m.PainelFinanceiro })),
)
const PainelNorte = lazy(() => import('../norte/PainelNorte').then((m) => ({ default: m.PainelNorte })))
const PainelSaude = lazy(() => import('../saude/PainelSaude').then((m) => ({ default: m.PainelSaude })))

// A largura sai do TIPO de conteúdo, não do gosto: conversa/menu/card
// cabem numa faixa estreita; dashboard e formulário tabular não.
const LARGURA_POR_AGENTE: Record<string, LarguraPainel> = {
  agenda: 'estreito',
  cifra: 'largo',
  vita: 'largo',
  norte: 'largo',
}

interface Props {
  agenteId: string
  aoFechar: () => void
}

export function PainelDoAgente({ agenteId, aoFechar }: Props) {
  const agente = AGENTES.find((a) => a.id === agenteId)
  const { data: doBackend } = useAgentes()

  if (!agente) return null

  // A junção é por ESPECIALIDADE — o id numérico do backend não tem
  // relação com o id string do escritório (ver guia-tecnico, PARTE 10).
  const backend = doBackend?.find((a) => a.especialidade === agente.especialidade)

  return (
    <PainelAgente
      agente={agente}
      estado={backend?.estado}
      largura={LARGURA_POR_AGENTE[agenteId] ?? 'estreito'}
      aoFechar={aoFechar}
    >
      <Suspense fallback={<EsqueletoPainel />}>
        {agenteId === 'agenda' && <PainelAgenda agente={agente} />}
        {agenteId === 'vita' && <PainelSaude />}
        {agenteId === 'norte' && <PainelNorte />}
        {agenteId === 'cifra' && <PainelFinanceiro />}
      </Suspense>
    </PainelAgente>
  )
}
