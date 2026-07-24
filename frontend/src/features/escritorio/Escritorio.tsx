import { Carpete } from './svgs/Carpete'

// Reconstrução da planta visual, camada por camada. Camada 1: só o chão,
// tela inteira, plano — sem paredes, sem mesas ainda.
export function Escritorio() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      <Carpete />
    </div>
  )
}
