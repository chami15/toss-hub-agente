import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as apiTick from '../api/tick'

const CHAVE_TICK = ['tick', 'atual']
const CHAVE_ORCAMENTO = ['tick', 'orcamento']

export function useTickAtual() {
  return useQuery({ queryKey: CHAVE_TICK, queryFn: apiTick.obterTickAtual })
}

export function useOrcamentoDoDia() {
  return useQuery({ queryKey: CHAVE_ORCAMENTO, queryFn: apiTick.obterOrcamentoDoDia })
}

export function useAvancarTick() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (dryRun: boolean) => apiTick.avancarTick(dryRun),
    onSuccess: (_resultado, dryRun) => {
      // dry_run não gravou nada — invalidar espantaria o preview que
      // acabou de aparecer na tela sem nenhum motivo (o servidor
      // devolveria exatamente o mesmo estado de antes)
      if (dryRun) return
      void cliente.invalidateQueries({ queryKey: CHAVE_TICK })
      void cliente.invalidateQueries({ queryKey: CHAVE_ORCAMENTO })
    },
  })
}
