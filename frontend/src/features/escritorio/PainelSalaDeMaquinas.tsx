import { mensagemDeErro } from '../../api/client'
import { useMetricasInfra, useSaudeInfra } from '../../hooks/useInfra'
import { BarraCapsula } from '../agentes/Barras'
import type { ItemSaude, StatusInfra } from '../../types/infra'

// A sala de máquinas — onde o chefe OLHA se o escritório está de pé.
//
// É a cara visível de duas coisas que eram invisíveis até agora: o custo
// de cada agente (que só passou a existir quando toda chamada de LLM
// virou uma linha em `tick_execucoes`) e a saúde das conexões (que antes
// só se descobria quando alguma coisa falhava).
//
// Nada aqui gasta LLM — os dois endpoints são leitura determinística,
// então o painel pode carregar ao abrir sem ferir o RNF01. É o mesmo
// motivo de o Motriz poder rodar em todo tick.

const MONO = 'var(--fonte-display), ui-monospace, SFMono-Regular, Menlo, monospace'

const BACKDROP: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(10, 12, 16, 0.55)',
  zIndex: 55,
}

const PAINEL: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: 'min(42vw, 460px)',
  fontFamily: MONO,
  color: 'var(--ink)',
  background: 'var(--deck)',
  borderRight: '1px solid var(--deck-line)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 60,
}

const CABECALHO: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px',
  background: 'var(--deck-2)',
  borderBottom: '1px solid var(--deck-line)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontSize: 12,
  color: 'var(--ink-dim)',
}

const SECAO: React.CSSProperties = {
  padding: '14px 16px',
  borderBottom: '1px solid var(--deck-line)',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const ROTULO: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--ink-dim)',
}

// 'nao_configurado' é cinza de propósito, não vermelho: o Norte sem
// token do GitHub num hub que não usa o Norte é uma escolha, não um
// defeito. Pintar os dois de vermelho ensinaria a ignorar o vermelho.
const COR_STATUS: Record<StatusInfra, string> = {
  ok: 'var(--good)',
  atencao: 'var(--official)',
  quebrado: 'var(--danger)',
  nao_configurado: 'var(--ink-faint)',
}

const ROTULO_STATUS: Record<StatusInfra, string> = {
  ok: 'de pé',
  atencao: 'atenção',
  quebrado: 'quebrado',
  nao_configurado: 'não configurado',
}

function moedaUsd(v: number): string {
  return `US$ ${v.toFixed(4)}`
}

interface Props {
  aoFechar: () => void
}

export function PainelSalaDeMaquinas({ aoFechar }: Props) {
  const { data: saude, isLoading: carregandoSaude, error: erroSaude } = useSaudeInfra()
  const { data: metricas, error: erroMetricas } = useMetricasInfra(1)

  const corGeral = saude ? COR_STATUS[saude.status_geral] : 'var(--ink-faint)'

  return (
    <>
      <div onClick={aoFechar} style={BACKDROP} />
      <div style={PAINEL}>
        <header style={CABECALHO}>
          <span>sala de máquinas</span>
          <button
            onClick={aoFechar}
            aria-label="fechar sala de máquinas"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ink)',
              fontSize: 18,
              lineHeight: 1,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ×
          </button>
        </header>

        {/* o respiro no fim não é estético: o cluster de ícones do HUD
            fica em zIndex 65 — ACIMA deste painel, de propósito, pra
            continuar clicável (ver Escritorio.tsx) — e cobriria as
            últimas linhas da lista. Com o padding, elas rolam pra cima
            dos ícones em vez de ficarem presas embaixo deles. */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 180 }}>
          {/* status geral — o pior item manda, pra nada ficar escondido */}
          <div style={SECAO}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: corGeral,
                  boxShadow: `0 0 10px 2px ${corGeral}`,
                  flexShrink: 0,
                }}
              />
              <div style={{ fontSize: 14 }}>
                {carregandoSaude
                  ? 'conferindo…'
                  : saude
                    ? `Escritório ${ROTULO_STATUS[saude.status_geral]}`
                    : '—'}
              </div>
            </div>
            {erroSaude && (
              <div style={{ color: '#f0b7ab', fontSize: 11.5, lineHeight: 1.5 }}>
                {mensagemDeErro(erroSaude)}
              </div>
            )}
          </div>

          {saude && (
            <div style={SECAO}>
              <div style={ROTULO}>conexões</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {saude.itens.map((item, i) => (
                  <LinhaSaude key={item.nome} item={item} indice={i} />
                ))}
              </div>
            </div>
          )}

          {metricas && (
            <>
              <div style={SECAO}>
                <div style={ROTULO}>gasto de hoje</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
                    {moedaUsd(metricas.custo_usd)}
                  </span>
                  <span style={{ color: 'var(--ink-dim)', fontSize: 11 }}>
                    de US$ {metricas.orcamento_diario_usd.toFixed(2)}
                  </span>
                </div>
                <BarraCapsula
                  pct={
                    metricas.orcamento_diario_usd
                      ? (metricas.custo_usd / metricas.orcamento_diario_usd) * 100
                      : 0
                  }
                  cor="var(--accent)"
                />
                <div style={{ display: 'flex', gap: 16, marginTop: 2 }}>
                  <Numero rotulo="chamadas" valor={`${metricas.chamadas}`} />
                  <Numero
                    rotulo="sucesso"
                    valor={`${Math.round(metricas.taxa_sucesso * 100)}%`}
                    cor={metricas.taxa_sucesso < 0.95 ? 'var(--official)' : undefined}
                  />
                  <Numero
                    rotulo="falhas"
                    valor={`${metricas.erros}`}
                    cor={metricas.erros > 0 ? 'var(--danger)' : undefined}
                  />
                </div>
              </div>

              <div style={SECAO}>
                <div style={ROTULO}>custo por agente — hoje</div>
                {metricas.por_agente.length === 0 ? (
                  <div style={{ color: 'var(--ink-faint)', fontSize: 11.5 }}>
                    Nenhuma chamada de LLM hoje. O escritório não gastou nada.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {metricas.por_agente.map((a, i) => (
                      <div
                        key={a.agente_id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          gap: 10,
                          fontSize: 12,
                          paddingBottom: 6,
                          borderBottom:
                            i < metricas.por_agente.length - 1 ? '1px solid var(--deck-line)' : 'none',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div>{a.agente_nome}</div>
                          <div style={{ ...ROTULO, marginTop: 2 }}>
                            {a.chamadas} chamada(s)
                            {a.erros > 0 && (
                              <span style={{ color: 'var(--danger)' }}> · {a.erros} com erro</span>
                            )}
                          </div>
                        </div>
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#a89f8c' }}>
                          {moedaUsd(a.custo_usd)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {metricas.ultimos_erros.length > 0 && (
                <div style={SECAO}>
                  <div style={ROTULO}>últimas falhas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {metricas.ultimos_erros.map((e) => (
                      <div
                        key={e.id}
                        style={{ borderLeft: '2px solid var(--danger)', paddingLeft: 8, fontSize: 11 }}
                      >
                        <div style={{ color: 'var(--ink-dim)' }}>
                          {e.agente_nome}
                          {/* tick nulo = ação que o chefe disparou, fora
                              do relógio do escritório (ver migration 010) */}
                          {e.tick === null ? ' · fora de tick' : ` · tick ${e.tick}`}
                        </div>
                        <div style={{ lineHeight: 1.5, overflowWrap: 'anywhere' }}>{e.erro}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {erroMetricas && (
            <div style={SECAO}>
              <div style={{ color: '#f0b7ab', fontSize: 11.5, lineHeight: 1.5 }}>
                {mensagemDeErro(erroMetricas)}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function LinhaSaude({ item, indice }: { item: ItemSaude; indice: number }) {
  const cor = COR_STATUS[item.status]
  return (
    <div
      style={{
        borderLeft: `2px solid ${cor}`,
        paddingLeft: 9,
        animation: 'consoleListaEntra .35s ease both',
        animationDelay: `${Math.min(indice, 12) * 0.04}s`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <span style={{ fontSize: 12.5 }}>{item.nome}</span>
        <span style={{ ...ROTULO, color: cor, flexShrink: 0 }}>{ROTULO_STATUS[item.status]}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-dim)', lineHeight: 1.5, marginTop: 2 }}>
        {item.detalhe}
      </div>
      {item.acao && (
        <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', lineHeight: 1.5, marginTop: 3 }}>
          → {item.acao}
        </div>
      )}
    </div>
  )
}

function Numero({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div>
      <div style={ROTULO}>{rotulo}</div>
      <div style={{ fontSize: 14, marginTop: 2, color: cor, fontVariantNumeric: 'tabular-nums' }}>
        {valor}
      </div>
    </div>
  )
}
