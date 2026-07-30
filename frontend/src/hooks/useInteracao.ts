import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as apiInteracao from '../api/interacao'

export function useProcessarRodada() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (dryRun: boolean) => apiInteracao.processarRodada(dryRun),
    onSuccess: (_resultado, dryRun) => {
      // dry_run não gasta nem grava — nada mudou pro resto do app
      if (dryRun) return
      // uma rodada real pode gastar orçamento (mensagem/ação de agente)
      // e mudar o estado de algum agente (falando/executando) — os dois
      // são lidos noutro lugar da tela (HUD do relógio, badge do painel
      // do agente), então invalidar é o que mantém as duas telas coerentes
      // com o que acabou de acontecer
      void cliente.invalidateQueries({ queryKey: ['tick', 'orcamento'] })
      void cliente.invalidateQueries({ queryKey: ['agentes'] })
    },
  })
}
