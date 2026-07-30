import { useEffect, useState } from 'react'
import { useAvancarTick, useOrcamentoDoDia, useTickAtual } from '../../hooks/useTick'
import { useProcessarRodada } from '../../hooks/useInteracao'
import { mensagemDeErro } from '../../api/client'
import type { TickAvancado } from '../../types/tick'
import type { InteracaoAgente } from '../../types/interacao'

// HUD do relógio simulado — Etapa 1 do motor de interação
// (docs/frontend-design.md, "Módulo de interação"). Fica SEMPRE visível,
// ao contrário dos outros painéis do escritório (edição, catálogo,
// salas), que aparecem e somem conforme o modo: tudo que existe no hub
// — mensagens entre agentes, estado deles, proatividade — é referenciado
// por número de tick, então esconder o tick seria esconder o relógio de
// um jogo em andamento.
//
// O avanço é sempre manual (RNF09: nenhuma automação de relógio nesta
// fase) — os dois botões existem porque "conferir" (dry_run) e "avançar
// de verdade" são ações DIFERENTES o bastante pra nunca virar um só
// clique: uma nunca grava nada, a outra sempre grava.
//
// A rodada (Etapas 2+3 — social e proatividade de trabalho) mora no
// MESMO cartão, atrás de um toggle, em vez de virar um painel à parte:
// na prática o fluxo é sempre "avancei o tempo → o que aconteceu?", e
// forçar o chefe a abrir outra janela pra ver a resposta da pergunta que
// acabou de fazer seria fricção sem propósito.

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

// A cor de trabalho é a MESMA usada na proposta pendente do painel da
// Agenda (COR_PROPOSTA) — em ambos os casos é "isto é oficial, o chefe
// precisa ver", então vale a mesma linguagem visual. Social usa um tom
// mais frio — é o "papo de copa" que também acontece, mas sem o mesmo peso.
const COR_TRABALHO = '#dbb15f'
const COR_SOCIAL = '#7fb8de'
const COR_NEUTRA = '#8d8779'

const CARTAO: React.CSSProperties = {
  position: 'absolute',
  left: 16,
  bottom: 16,
  fontFamily: MONO,
  fontSize: 12,
  color: '#e6e1d6',
  background: 'rgba(20, 22, 27, 0.93)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  userSelect: 'none',
  // acima do backdrop que os painéis "largo" (Cifra/Vita/Norte) abrem
  // (zIndex 55) — o relógio do mundo continua legível e clicável mesmo
  // com um painel grande aberto por cima, como o HUD de um jogo
  zIndex: 56,
}

const ROTULO: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#8d8779',
}

const LINHA: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 8,
}

const BOTAO: React.CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 5,
  color: '#e6e1d6',
  font: 'inherit',
  fontSize: 11,
  padding: '6px 8px',
  cursor: 'pointer',
}

const BOTAO_PRINCIPAL: React.CSSProperties = {
  ...BOTAO,
  background: 'rgba(74,222,128,0.16)',
  borderColor: 'rgba(74,222,128,0.4)',
}

const PREVIEW: React.CSSProperties = {
  fontSize: 11,
  lineHeight: 1.5,
  color: COR_TRABALHO,
  border: '1px solid rgba(219,177,95,0.35)',
  borderRadius: 6,
  padding: '7px 9px',
  background: 'rgba(219,177,95,0.08)',
}

const ERRO: React.CSSProperties = {
  color: '#f0b7ab',
  fontSize: 11,
  lineHeight: 1.5,
}

const LINK: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#8d8779',
  font: 'inherit',
  fontSize: 11,
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
}

const DIVISOR: React.CSSProperties = {
  height: 1,
  background: 'rgba(255,255,255,0.1)',
  margin: '2px 0',
}

// dia da semana abreviado + data + hora — o suficiente pra bater com o
// "hoje é sexta-feira, de manhã" que os agentes usam internamente
// (_fato_do_dia, resolvers/interacao.py), sem repetir o texto inteiro
function formatarHoraSimulada(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// USD porque é orçamento de custo de LLM, não dinheiro do chefe (isso é
// o Cifra, e usa BRL) — moedas diferentes representando coisas
// diferentes, não é inconsistência
function formatarUsd(valor: number): string {
  return valor.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

export function PainelRelogio() {
  const { data: tick, error: erroTick } = useTickAtual()
  const { data: orcamento } = useOrcamentoDoDia()
  const avancar = useAvancarTick()
  const [preview, setPreview] = useState<TickAvancado | null>(null)
  const [rodadaAberta, setRodadaAberta] = useState(false)

  // um avanço de verdade invalida o preview: ele era sobre o tick
  // ANTERIOR, e continuar mostrando confundiria com o resultado real
  useEffect(() => {
    if (!avancar.isPending) return
    setPreview(null)
  }, [avancar.isPending])

  function conferir() {
    avancar.mutate(true, { onSuccess: (r) => setPreview(r) })
  }

  function avancarDeVerdade() {
    setPreview(null)
    avancar.mutate(false)
  }

  // backend fora do ar: degrada em silêncio (mesmo padrão do estado do
  // agente em PainelAgente) em vez de quebrar o HUD inteiro por causa
  // de um relógio que não conseguiu ler a hora
  if (erroTick) {
    return (
      <div style={CARTAO}>
        <div style={ROTULO}>relógio</div>
        <div style={ERRO}>{mensagemDeErro(erroTick)}</div>
      </div>
    )
  }

  const parado = !tick || tick.numero === 0

  return (
    <div style={{ ...CARTAO, width: rodadaAberta ? 320 : 236 }}>
      <div style={LINHA}>
        <div style={ROTULO}>relógio simulado</div>
        <div style={{ color: '#8d8779' }}>{parado ? '—' : `tick ${tick.numero}`}</div>
      </div>

      <div style={{ fontSize: 13 }}>
        {parado ? 'nunca avançou' : formatarHoraSimulada(tick.hora_simulada!)}
      </div>

      {orcamento && (
        <div style={LINHA}>
          <span style={{ color: '#8d8779' }}>orçamento hoje</span>
          <span>
            {formatarUsd(orcamento.gasto_hoje)} usado · {formatarUsd(orcamento.disponivel_hoje)} livre
          </span>
        </div>
      )}

      {preview && (
        <div style={PREVIEW}>
          conferido: seria o tick {preview.numero}, {formatarHoraSimulada(preview.hora_simulada)} · restariam{' '}
          {formatarUsd(preview.orcamento_disponivel_hoje)}
        </div>
      )}

      {avancar.isError && <div style={ERRO}>{mensagemDeErro(avancar.error)}</div>}

      <div style={{ display: 'flex', gap: 6 }}>
        <button style={BOTAO} onClick={conferir} disabled={avancar.isPending}>
          conferir
        </button>
        <button style={BOTAO_PRINCIPAL} onClick={avancarDeVerdade} disabled={avancar.isPending}>
          {avancar.isPending ? 'avançando…' : 'avançar tempo →'}
        </button>
      </div>

      <div style={DIVISOR} />

      <button style={LINK} onClick={() => setRodadaAberta((v) => !v)}>
        {rodadaAberta ? '▾' : '▸'} rodada do tick (social + trabalho)
      </button>

      {rodadaAberta && <SecaoRodada parado={parado} />}
    </div>
  )
}

function SecaoRodada({ parado }: { parado: boolean }) {
  const processar = useProcessarRodada()

  if (parado) {
    return (
      <div style={{ color: '#8d8779', fontSize: 11, lineHeight: 1.5 }}>
        avance o relógio antes de processar uma rodada — é o mesmo requisito do backend
        (não existe "rodada" sem tick pra registrá-la).
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={BOTAO} onClick={() => processar.mutate(true)} disabled={processar.isPending}>
          conferir
        </button>
        <button style={BOTAO_PRINCIPAL} onClick={() => processar.mutate(false)} disabled={processar.isPending}>
          {processar.isPending ? 'processando…' : 'processar rodada'}
        </button>
      </div>

      {processar.isError && <div style={ERRO}>{mensagemDeErro(processar.error)}</div>}

      {processar.data && (
        <>
          {/* aviso de RODADA INTEIRA (orçamento esgotado, sem
              colaborador ativo) — quando existe, `interacoes` vem
              vazio, então ele é tudo que há pra mostrar */}
          {processar.data.aviso && <div style={ERRO}>{processar.data.aviso}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {processar.data.interacoes.map((entrada) => (
              <LinhaInteracao key={entrada.agente_id} entrada={entrada} dryRun={processar.data!.dry_run} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function LinhaInteracao({ entrada, dryRun }: { entrada: InteracaoAgente; dryRun: boolean }) {
  const cor = entrada.tipo === 'trabalho' ? COR_TRABALHO : entrada.tipo === 'social' ? COR_SOCIAL : COR_NEUTRA

  return (
    <div style={{ borderLeft: `2px solid ${cor}`, paddingLeft: 8 }}>
      <div style={{ color: cor, fontSize: 10.5 }}>
        {entrada.agente_nome}
        {dryRun && (entrada.tipo || entrada.chance_falar !== null) ? ' · conferido' : ''}
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.5, color: '#e6e1d6' }}>{textoDaLinha(entrada)}</div>
      {entrada.aviso && <div style={{ ...ERRO, marginTop: 2 }}>{entrada.aviso}</div>}
    </div>
  )
}

// O texto muda de forma conforme o que a entrada TEM: dry_run nunca gera
// `mensagem` (só decide tipo/destinatário), então "conferido" e "de
// verdade" precisam de frases diferentes mesmo pro mesmo tipo — dizer
// "avisou o chefe" sobre algo que não foi executado seria mentira.
function textoDaLinha(entrada: InteracaoAgente): string {
  if (entrada.tipo === 'trabalho') {
    return entrada.mensagem ? `avisou o chefe: "${entrada.mensagem}"` : `dispararia trabalho — ${entrada.motivo}`
  }
  if (entrada.tipo === 'social') {
    if (entrada.mensagem) return `→ ${entrada.destinatario_nome}: "${entrada.mensagem}"`
    if (entrada.destinatario_nome) return `falaria com ${entrada.destinatario_nome}`
    // quer_falar true mas sem destinatário elegível — o `aviso` da
    // entrada já explica o motivo (rate limit do dia), então aqui basta
    // dizer QUE ele quis
    return 'quis falar, mas sem destinatário disponível'
  }
  return entrada.chance_falar !== null
    ? `sem ação (rolou ${Math.round(entrada.chance_falar * 100)}% de chance de puxar papo e não puxou)`
    : 'sem ação neste tick'
}
