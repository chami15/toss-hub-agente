import { AGENTES, type AgenteVisual } from '../escritorio/agentes'
import { useAgentes } from '../../hooks/useAgentes'
import { PainelAgenda } from '../agenda/PainelAgenda'
import { PainelNorte } from '../norte/PainelNorte'
import { PainelSaude } from '../saude/PainelSaude'
import { PainelAgente, type LarguraPainel } from './PainelAgente'

// Escolhe QUAL painel abrir pra cada agente. Existe porque não há um
// "painel genérico" que sirva pros quatro (ver frontend-design.md): o
// conteúdo é chat, dashboard, menu de forms ou card — coisas sem nada
// em comum além da moldura.

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
      {agenteId === 'agenda' && <PainelAgenda agente={agente} />}
      {agenteId === 'vita' && <PainelSaude />}
      {agenteId === 'norte' && <PainelNorte />}
      {agenteId === 'cifra' && <AindaNaoTem agente={agente} />}
    </PainelAgente>
  )
}

// Clicar num agente sem painel não pode simplesmente não fazer nada —
// isso se lê como bug. Melhor abrir e dizer que ainda não existe.
function AindaNaoTem({ agente }: { agente: AgenteVisual }) {
  return (
    <div style={{ padding: '18px 16px', color: '#8d8779', fontSize: 12, lineHeight: 1.7 }}>
      O painel de {agente.nome} ainda não foi construído.
      <br />
      <br />
      O backend já existe — falta só esta tela.
    </div>
  )
}
