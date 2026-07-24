// Piso do escritório, estilo Habbo: quadriculado em losango, proporção
// 2:1 (o ângulo isométrico clássico), tela inteira. É um único <pattern>
// SVG (um quadrado normal, com um checker 2x2 dentro) girado 45° e
// achatado no eixo Y pela metade — o mesmo truque de scale+rotate do
// protótipo, sem precisar desenhar cada losango como elemento separado.
// Cores: carpete tile cinza frio, baixo contraste — evita o efeito de
// vibração/ilusão de ótica que um xadrez de alto contraste causa nesse
// losango pequeno (aprovado antes; a referência do Habbo era só pra
// pegar a PROPORÇÃO/profundidade, não a cor).
//
// TAMANHO menor que antes (era 112) — losangos menores dão a impressão
// de estar mais longe/o chão ser bem maior, sensação de profundidade.
const TAMANHO = 72
const CLARO = '#a8a9a6'
const ESCURO = '#989995'
const GRUDE = '#8f908c'

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
