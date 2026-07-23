import { Fragment } from 'react'

// Uma janela vista de cima, embutida na parede lateral (vertical): vidro
// azulado + linhas claras sugerindo cortina. Retângulo alto e fino porque
// é um segmento da parede vertical.
function Janela() {
  return (
    <svg width={18} height={40} viewBox="0 0 18 40" style={{ display: 'block' }}>
      <rect x="0" y="0" width="18" height="40" fill="#bfd9e8" />
      <rect x="0" y="0" width="18" height="40" fill="none" stroke="#8fb3c9" strokeWidth="1.5" />
      {/* cortina: listras verticais claras */}
      <line x1="4.5" y1="2" x2="4.5" y2="38" stroke="#eef4f8" strokeWidth="2" />
      <line x1="9" y1="2" x2="9" y2="38" stroke="#eef4f8" strokeWidth="2" />
      <line x1="13.5" y1="2" x2="13.5" y2="38" stroke="#eef4f8" strokeWidth="2" />
    </svg>
  )
}

// A "viga": trecho curto de parede sólida que separa cada par de janelas.
function Viga() {
  return <div style={{ width: 18, height: 16, background: '#9a9182', borderRadius: 2 }} />
}

// Faixa vertical de janelas de uma parede lateral: 10 janelas em 5 pares,
// com uma viga entre cada par, e "ponta de parede" (padding) em cima e
// embaixo — nenhuma janela nas extremidades.
const PARES = 5

export function FaixaDeJanelas() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: '100%',
        paddingBlock: 24, // pontas de parede sem janela
      }}
    >
      {Array.from({ length: PARES }).map((_, par) => (
        <Fragment key={par}>
          {par > 0 && <Viga />}
          <Janela />
          <Janela />
        </Fragment>
      ))}
    </div>
  )
}
