import { useState } from 'react'
import { mensagemDeErro } from '../../api/client'
import { useDashboardFinanceiro } from '../../hooks/useFinanceiro'
import type { DashboardFinanceiro } from '../../types/financeiro'
import { AVISO_ERRO, BOTAO, CAMPO, CARTAO, CORPO, ROTULO } from './estilos'
import { BarrasCategoria, ColunasDiarias, moeda } from './graficos'
import { RelatorioMensal } from './RelatorioMensal'
import { UploadExtrato } from './UploadExtrato'

// O painel do Cifra: dashboard, sem chat.
//
// O seletor de mês fica numa faixa ÚNICA no topo, valendo pro painel
// inteiro — nunca um filtro dentro de cada gráfico, que faria dois
// gráficos lado a lado poderem estar mostrando meses diferentes.

type Vista = 'painel' | 'extrato' | 'relatorio'

function mesAtual(): string {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

export function PainelFinanceiro() {
  const [mes, setMes] = useState(mesAtual())
  const [vista, setVista] = useState<Vista>('painel')

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px 0' }}>
        {vista !== 'painel' && (
          <button style={{ ...BOTAO, fontSize: 11, padding: '4px 10px' }} onClick={() => setVista('painel')}>
            ← voltar
          </button>
        )}
        <input
          style={{ ...CAMPO, width: 130 }}
          aria-label="mês"
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
        />
        {vista === 'painel' && (
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <button style={{ ...BOTAO, fontSize: 11 }} onClick={() => setVista('extrato')}>
              importar extrato
            </button>
            <button style={{ ...BOTAO, fontSize: 11 }} onClick={() => setVista('relatorio')}>
              relatório
            </button>
          </div>
        )}
      </div>

      {vista === 'extrato' && <UploadExtrato mes={mes} />}
      {vista === 'relatorio' && <RelatorioMensal mes={mes} />}
      {vista === 'painel' && <Dashboard mes={mes} />}
    </>
  )
}

function Dashboard({ mes }: { mes: string }) {
  const { data, isLoading, error } = useDashboardFinanceiro(mes)

  if (isLoading) return <div style={CORPO}>carregando…</div>
  if (error) {
    return (
      <div style={CORPO}>
        <div style={AVISO_ERRO}>{mensagemDeErro(error)}</div>
      </div>
    )
  }
  if (!data) return null

  const vazio = data.kpis.gasto_mensal === 0 && data.kpis.ganho_mensal === 0

  return (
    <div style={CORPO}>
      {vazio && (
        <div style={{ color: '#8d8779', fontSize: 12, lineHeight: 1.7 }}>
          Nenhum lançamento neste mês. Importe um extrato pra começar.
        </div>
      )}

      <Kpis kpis={data.kpis} />
      <BarrasCategoria dados={data.graficos.gastos_por_categoria} />
      <ColunasDiarias dados={data.graficos.evolucao_diaria} />
      <MaioresGastos gastos={data.maiores_gastos} />
      <Recorrencias itens={data.recorrencias_detectadas} />
    </div>
  )
}

function Kpis({ kpis }: { kpis: DashboardFinanceiro['kpis'] }) {
  // `saldo_ultimo_extrato` fica de fora: o backend ainda não extrai
  // saldo de fechamento (TODO declarado no resolver), então ele é sempre
  // null. Um KPI permanentemente vazio é ruído — melhor não existir até
  // o dado existir.
  return (
    <div style={{ ...CARTAO, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
      <Kpi rotulo="gasto no mês" valor={moeda(kpis.gasto_mensal)} destaque />
      <Kpi rotulo="entrou" valor={moeda(kpis.ganho_mensal)} />
      <Kpi rotulo="previsto pro mês que vem" valor={moeda(kpis.gasto_previsto_proximo_mes)} />
    </div>
  )
}

function Kpi({ rotulo, valor, destaque = false }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <div style={{ ...ROTULO, marginBottom: 3 }}>{rotulo}</div>
      {/* o número grande não usa tabular-nums de propósito: largura
          igual por dígito abre buracos e faz o valor parecer espaçado */}
      <div style={{ fontSize: destaque ? 24 : 16, color: destaque ? '#4ade80' : '#e6e1d6', lineHeight: 1.2 }}>
        {valor}
      </div>
    </div>
  )
}

function MaioresGastos({ gastos }: { gastos: DashboardFinanceiro['maiores_gastos'] }) {
  if (gastos.length === 0) return null
  return (
    <div>
      <div style={ROTULO}>maiores gastos</div>
      <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {gastos.map((g, i) => (
          <li key={`${g.data}-${g.descricao}-${i}`} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.descricao}</div>
              <div style={{ ...ROTULO, marginBottom: 0, marginTop: 2 }}>
                {g.categoria} · {new Date(g.data).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <span style={{ color: '#a89f8c' }}>{moeda(g.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Recorrencias({ itens }: { itens: DashboardFinanceiro['recorrencias_detectadas'] }) {
  if (itens.length === 0) return null
  return (
    <div>
      <div style={ROTULO}>recorrências detectadas</div>
      <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {itens.map((r, i) => (
          <li key={`${r.descricao}-${i}`} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descricao}</div>
              <div style={{ ...ROTULO, marginBottom: 0, marginTop: 2 }}>
                {r.tipo === 'parcela' && r.parcela_atual && r.parcela_total
                  ? `parcela ${r.parcela_atual}/${r.parcela_total}`
                  : 'assinatura'}
                {/* o que NÃO projeta pro mês que vem precisa se
                    diferenciar: é a parcela que está acabando, e ela sai
                    da conta do previsto */}
                {!r.projeta_proximo_mes && ' · última'}
              </div>
            </div>
            <span style={{ color: '#a89f8c' }}>{moeda(r.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
