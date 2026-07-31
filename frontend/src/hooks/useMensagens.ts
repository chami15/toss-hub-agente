import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as apiMensagens from '../api/mensagens'

const CHAVE_MENSAGENS = ['mensagens']

export function useMensagens() {
  return useQuery({ queryKey: CHAVE_MENSAGENS, queryFn: () => apiMensagens.listarMensagens() })
}

export function useResponderMensagem() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ mensagemId, conteudo }: { mensagemId: number; conteudo: string }) =>
      apiMensagens.responderMensagem(mensagemId, conteudo),
    // a resposta do chefe é, ela mesma, uma mensagem nova — reinvalidar
    // é o que faz ela aparecer na própria conversa sem precisar de um
    // segundo estado local só pra essa mensagem
    onSuccess: () => void cliente.invalidateQueries({ queryKey: CHAVE_MENSAGENS }),
  })
}
