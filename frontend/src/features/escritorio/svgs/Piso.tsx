// Piso do escritório, estilo Habbo: quadriculado em losango, proporção
// 2:1 (o ângulo isométrico clássico), tela inteira. É um único <pattern>
// SVG (um quadrado normal, com um checker 2x2 dentro) girado 45° e
// achatado no eixo Y pela metade — o mesmo truque de scale+rotate do
// protótipo, sem precisar desenhar cada losango como elemento separado.
// Cores: carpete cinza escuro (no lugar do "verde" clássico do Habbo) e
// cinza claro (no lugar do "branco"), com linhas de grude mais escuras.
const TAMANHO = 112
const CLARO = '#7a766e'
const ESCURO = '#4f4b45'
const GRUDE = '#332f2a'

export function Piso() {
  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0, display: 'block' }}
      preserveAspectRatio="none"
    >
      <defs>
        <pattern
          id="piso-habbo"
          width={TAMANHO}
          height={TAMANHO}
          patternUnits="userSpaceOnUse"
          patternTransform="scale(1,0.5) rotate(45)"
        >
          <rect width={TAMANHO} height={TAMANHO} fill={CLARO} stroke={GRUDE} strokeWidth="3" />
          <rect x="0" y="0" width={TAMANHO / 2} height={TAMANHO / 2} fill={ESCURO} stroke={GRUDE} strokeWidth="3" />
          <rect x={TAMANHO / 2} y={TAMANHO / 2} width={TAMANHO / 2} height={TAMANHO / 2} fill={ESCURO} stroke={GRUDE} strokeWidth="3" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#piso-habbo)" />
    </svg>
  )
}
