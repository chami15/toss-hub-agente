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
    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
      {/* A SALA — piso + paredes (borda). Tamanho fixo por enquanto; a
          gente calibra olhando o resultado. */}
      <div
        style={{
          position: 'relative',
          width: 840,
          height: 640,
          background: '#ece7df',
          border: '8px solid #b8ae9e',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {/* janelas na parede esquerda */}
        <div style={{ position: 'absolute', left: 2, top: 0, height: '100%' }}>
          <FaixaDeJanelas />
        </div>
        {/* janelas na parede direita */}
        <div style={{ position: 'absolute', right: 2, top: 0, height: '100%' }}>
          <FaixaDeJanelas />
        </div>

        {/* mesa do chefe — topo, centro */}
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)' }}>
          <MesaChefe agente={chefe} />
        </div>

        {/* box de mesas — centro da sala */}
        <div style={{ position: 'absolute', top: 210, left: '50%', transform: 'translateX(-50%)' }}>
          <BoxDeMesas slots={slots} />
        </div>
      </div>
    </div>
  )
}
