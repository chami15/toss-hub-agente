import { Carpete } from './svgs/Carpete'
import { MesaChefe } from './svgs/MesaChefe'

// Reconstrução da planta visual, camada por camada. Camada 2: chão +
// mesa do chefe, no topo-centro, olhando pra dentro da sala.
export function Escritorio() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      <Carpete />
      <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)' }}>
        <MesaChefe />
      </div>
    </div>
  )
}
