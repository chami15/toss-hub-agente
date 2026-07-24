import { Piso } from './svgs/Piso'
import { Parede } from './svgs/Parede'

// Fundação do escritório, estilo Habbo: planta em L de verdade (ver
// mapa.ts), coordenadas calculadas por matemática isométrica (iso.ts),
// não mais porcentagens chutadas. Fundo preto absoluto — "vitrine
// flutuando no vazio" — e sem teto (visão de cima aberta).
const VIEWBOX = '-350 -100 740 470'

export function Escritorio() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg viewBox={VIEWBOX} style={{ width: 'min(94vw, 1400px)', height: 'auto', display: 'block' }}>
        <Parede />
        <Piso />
      </svg>
    </div>
  )
}
