import type { Agente } from '../../../types/agente'
import { Avatar } from './Avatar'

const LARGURA = 190
const ALTURA = 120

// A mesa do chefe: única, sem box nem paredes, no topo-centro olhando pro
// escritório inteiro. Visualmente destacada — mais larga, madeira mais
// escura (um ar de "sala da diretoria") e um tapete atrás. O chefe fica
// no topo (olhando pra baixo, pra sala).
export function MesaChefe({ agente }: { agente?: Agente | null }) {
  return (
    <div style={{ position: 'relative', width: LARGURA, height: ALTURA }}>
      <svg width={LARGURA} height={ALTURA} viewBox={`0 0 ${LARGURA} ${ALTURA}`} style={{ display: 'block' }}>
        {/* tapete/área da diretoria */}
        <rect x="10" y="8" width="170" height="104" rx="10" fill="#e4d9c6" />
        {/* sombra da mesa */}
        <rect x="33" y="62" width="128" height="46" rx="6" fill="#00000018" />
        {/* mesa (madeira mais escura que as comuns) */}
        <rect x="30" y="58" width="130" height="46" rx="6" fill="#9c6b3f" />
        <rect x="30" y="58" width="130" height="46" rx="6" fill="none" stroke="#7a5230" strokeWidth="2" />
        {/* monitor (borda longe do chefe, que está em cima) */}
        <rect x="75" y="86" width="40" height="14" rx="2" fill="#2c2c34" />
        <rect x="79" y="89" width="32" height="8" rx="1" fill="#3e5b72" />
        {/* teclado (perto do chefe) */}
        <rect x="72" y="64" width="46" height="14" rx="2" fill="#d8d5ce" stroke="#bdb9b0" />
      </svg>

      {agente && (
        <div style={{ position: 'absolute', left: LARGURA / 2 - 20, top: 8 }}>
          <Avatar agente={agente} />
        </div>
      )}
    </div>
  )
}
