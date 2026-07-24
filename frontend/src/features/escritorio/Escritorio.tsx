import { Piso } from './svgs/Piso'
import { Parede } from './svgs/Parede'
import { Divisoria } from './svgs/Divisoria'

// Fundação do escritório no estilo Habbo (isométrico 2:1). A sala volta
// a ser um "cartão" centralizado com fundo preto ao redor (como a
// referência clássica) — decisão revertida a pedido do chefe, que
// achou que o preto reforça a sensação de profundidade da paisagem.
//
// Profundidade em camadas: além da parede de fundo, uma divisória solta
// no meio do piso sugere um segundo ambiente mais atrás, sem precisar
// desenhar uma planta em L completa (isso fica pra uma próxima rodada).
export function Escritorio() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(92vw, 1300px)',
          aspectRatio: '1.44',
          overflow: 'hidden',
        }}
      >
        <Piso />
        <Parede />
        <Divisoria />
      </div>
    </div>
  )
}
