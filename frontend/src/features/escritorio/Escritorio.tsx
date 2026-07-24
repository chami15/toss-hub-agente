import { Carpete } from './svgs/Carpete'
import { MesaChefe } from './svgs/MesaChefe'

// Reconstrução da planta visual, camada por camada. Camada 2: chão +
// mesa do chefe, no meio do canto inferior, olhando pra dentro da sala
// (o resto do escritório vai se estender pra cima, na frente dela).
export function Escritorio() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      <Carpete />
      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)' }}>
        <MesaChefe />
      </div>
    </div>
  )
}
