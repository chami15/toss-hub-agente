import { Piso } from './svgs/Piso'
import { Parede } from './svgs/Parede'

// Fundação do escritório no novo estilo (Habbo, isométrico 2:1) — piso
// quadriculado em losango + as duas paredes de fundo, tela inteira, sem
// fundo preto. Direção oficial do projeto a partir daqui; substitui a
// versão anterior em top-down plano.
export function Escritorio() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      <Piso />
      <Parede />
    </div>
  )
}
