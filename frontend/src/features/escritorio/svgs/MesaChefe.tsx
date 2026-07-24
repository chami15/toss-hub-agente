// Mesa do chefe (arte própria, gerada no Recraft) — peça única, sem
// fundo. A arte original aponta pra fora da sala; espelhamos só no eixo
// X (scaleX) pra apontar pra dentro sem "soltar" as pernas da mesa da
// madeira (uma inversão vertical fazia as pernas flutuarem por cima).
const LARGURA_ORIGINAL = 1292
const ALTURA_ORIGINAL = 840
const LARGURA_EXIBIDA = 380
const ALTURA_EXIBIDA = (LARGURA_EXIBIDA / LARGURA_ORIGINAL) * ALTURA_ORIGINAL

export function MesaChefe() {
  return (
    <div
      style={{
        width: LARGURA_EXIBIDA,
        height: ALTURA_EXIBIDA,
        transform: 'scaleX(-1)',
      }}
    >
      <img
        src="/mesaChefe.svg"
        alt=""
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  )
}
