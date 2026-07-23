import type { Agente } from '../../types/agente'
import { useAgentes } from '../../hooks/useAgentes'
import { LAYOUT_MESAS } from './layout'
import { BoxDeMesas } from './components/BoxDeMesas'
import { MesaChefe } from './components/MesaChefe'
import { FaixaDeJanelas } from './components/Janelas'

// Monta os 4 slots de um box na ordem [cima-esq, cima-dir, baixo-esq,
// baixo-dir] a partir dos colaboradores e do mapa visual LAYOUT_MESAS.
// Slot vazio (null) = cadeira reservada pra um agente futuro.
function montarSlotsDoBox(box: number, colaboradores: Agente[]): (Agente | null)[] {
  const slots: (Agente | null)[] = [null, null, null, null]
  for (const agente of colaboradores) {
    if (agente.mesa == null) continue
    const pos = LAYOUT_MESAS[agente.mesa]
    if (pos && pos.box === box) {
      slots[pos.linha * 2 + pos.coluna] = agente
    }
  }
  return slots
}

export function Escritorio() {
  const { data: agentes, isLoading, error } = useAgentes()

  if (isLoading) return <p style={{ padding: 24 }}>Carregando escritório...</p>
  if (error) {
    return (
      <p style={{ padding: 24, color: 'crimson' }}>
        Erro ao carregar o escritório: {(error as Error).message}. O backend está
        rodando em {import.meta.env.VITE_API_URL}?
      </p>
    )
  }

  const chefe = agentes?.find((a) => a.tipo === 'chefe') ?? null
  const colaboradores = agentes?.filter((a) => a.tipo === 'colaborador') ?? []
  const slots = montarSlotsDoBox(0, colaboradores)

  return (
    // A SALA — o piso ocupa a janela inteira do navegador, sem borda/moldura
    // (nada de "caixa" — o chão é o próprio fundo da página).
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        background: '#ece7df',
        overflow: 'hidden',
      }}
    >
      {/* janelas na parede esquerda */}
      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%' }}>
        <FaixaDeJanelas />
      </div>
      {/* janelas na parede direita */}
      <div style={{ position: 'absolute', right: 0, top: 0, height: '100%' }}>
        <FaixaDeJanelas />
      </div>

      {/* chefe + box de mesas, empilhados e centralizados na sala inteira */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 48,
        }}
      >
        <MesaChefe agente={chefe} />
        <BoxDeMesas slots={slots} />
      </div>
    </div>
  )
}
