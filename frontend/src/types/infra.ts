// Espelha backend/resolvers/infra.py (GET /infra/saude, /infra/metricas).
// Nada aqui gasta LLM — os dois endpoints são leitura determinística,
// então podem carregar ao abrir o painel sem ferir o RNF01.

export type StatusInfra = 'ok' | 'atencao' | 'quebrado' | 'nao_configurado'

export interface ItemSaude {
  nome: string
  status: StatusInfra
  detalhe: string
  // o que fazer a respeito — só vem preenchido quando existe uma ação
  // concreta do chefe. Aviso sem ação é aviso que ensina a ignorar aviso.
  acao: string | null
}

export interface SaudeInfra {
  // o PIOR status entre os itens: um item quebrado nunca fica escondido
  // atrás de cinco itens ok
  status_geral: StatusInfra
  itens: ItemSaude[]
}

export interface CustoPorAgente {
  agente_id: number
  agente_nome: string
  especialidade: string
  chamadas: number
  custo_usd: number
  tokens_in: number
  tokens_out: number
  erros: number
}

export interface ErroExecucao {
  id: number
  // null quando a chamada aconteceu FORA de um tick — ação que o chefe
  // disparou direto (gerar relatório, falar com a Agenda). Não é dado
  // faltando, é a distinção entre "o escritório gastou sozinho" e "eu
  // mandei gastar" (ver migration 010).
  tick: number | null
  agente_nome: string
  modelo: string | null
  erro: string | null
  criado_em: string | null
}

export interface MetricasInfra {
  desde: string
  dias: number
  chamadas: number
  ticks_com_gasto: number
  custo_usd: number
  erros: number
  taxa_sucesso: number
  custo_medio_por_chamada: number
  orcamento_diario_usd: number
  por_agente: CustoPorAgente[]
  ultimos_erros: ErroExecucao[]
}
