export type OrientacaoCadeira = 'cima' | 'baixo'

interface CadeiraProps {
  virada?: OrientacaoCadeira
}

const LARGURA = 140
const ALTURA = 170

// Cadeira de couro, giratória, base em estrela de 5 pontas com rodinhas
// nas pontas e apoio de braço — peça própria, reutilizada em toda mesa
// do escritório (mesma cadeira neutra pra todo mundo; a cor de
// identidade do agente entra por CIMA dela, via Avatar). Desenhada na
// orientação "baixo" (encosto pro topo, pessoa sentada olhando pra
// baixo/pra fora); pra orientação "cima" a peça inteira é espelhada no
// eixo Y (GPU-only, sem recalcular layout).
export function Cadeira({ virada = 'baixo' }: CadeiraProps) {
  const flip = virada === 'cima'

  return (
    <svg
      width={LARGURA}
      height={ALTURA}
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      style={{ transform: flip ? 'scaleY(-1)' : 'none', display: 'block' }}
    >
      <defs>
        <linearGradient id="couro-cadeira" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#75543f" />
          <stop offset="1" stopColor="#3e2b20" />
        </linearGradient>
        <linearGradient id="couro-cadeira-braco" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5c4130" />
          <stop offset="1" stopColor="#43301fe0" />
        </linearGradient>
      </defs>

      {/* sombra suave no chão, embaixo da cadeira inteira */}
      <ellipse cx="72" cy="146" rx="52" ry="18" fill="#000000" opacity="0.14" />

      {/* base em estrela de 5 pontas — hastes pretas, estilo hollow/metal,
          com rodinha em cada ponta */}
      <g>
        {/* hastes (do centro pra cada ponta) */}
        <path d="M70 118 L70 72" stroke="#1c1c1e" strokeWidth="7" strokeLinecap="round" />
        <path d="M70 118 L113.7 103.8" stroke="#1c1c1e" strokeWidth="7" strokeLinecap="round" />
        <path d="M70 118 L97 155.2" stroke="#1c1c1e" strokeWidth="7" strokeLinecap="round" />
        <path d="M70 118 L43 155.2" stroke="#1c1c1e" strokeWidth="7" strokeLinecap="round" />
        <path d="M70 118 L26.3 103.8" stroke="#1c1c1e" strokeWidth="7" strokeLinecap="round" />
        {/* friso central mais claro em cada haste — dá o ar de metal oco */}
        <path d="M70 116 L70 74" stroke="#4a4a4e" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M70 116 L110.9 103.2" stroke="#4a4a4e" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M70 116 L94.7 152.4" stroke="#4a4a4e" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M70 116 L45.3 152.4" stroke="#4a4a4e" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M70 116 L29.1 103.2" stroke="#4a4a4e" strokeWidth="1.6" strokeLinecap="round" />

        {/* rodinhas nas pontas */}
        {[
          [70, 72],
          [113.7, 103.8],
          [97, 155.2],
          [43, 155.2],
          [26.3, 103.8],
        ].map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r="7" fill="#1c1c1e" stroke="#000" strokeWidth="1" />
            <circle cx={cx - 1.5} cy={cy - 1.5} r="2.4" fill="#4a4a4e" opacity="0.8" />
          </g>
        ))}

        {/* eixo/coluna central (gás lift), visto de cima */}
        <circle cx="70" cy="116" r="9" fill="#1c1c1e" stroke="#000" strokeWidth="1" />
        <circle cx="70" cy="116" r="4" fill="#3a3a3e" />
      </g>

      {/* apoios de braço */}
      <rect x="24" y="88" width="17" height="42" rx="8.5" fill="url(#couro-cadeira-braco)" stroke="#2a1c14" strokeWidth="1.4" />
      <rect x="99" y="88" width="17" height="42" rx="8.5" fill="url(#couro-cadeira-braco)" stroke="#2a1c14" strokeWidth="1.4" />

      {/* encosto (atrás/acima do assento) */}
      <rect x="41" y="28" width="58" height="66" rx="24" fill="url(#couro-cadeira)" stroke="#2a1c14" strokeWidth="1.6" />
      <rect x="49" y="35" width="42" height="30" rx="16" fill="#ffffff" opacity="0.06" />

      {/* assento — bem arredondado, ar fofo/confortável */}
      <rect x="36" y="82" width="68" height="58" rx="26" fill="url(#couro-cadeira)" stroke="#2a1c14" strokeWidth="1.6" />
      <rect x="46" y="90" width="48" height="22" rx="11" fill="#ffffff" opacity="0.08" />
      {/* costura central sutil, sugerindo estofado */}
      <path d="M70 92 Q70 111 70 130" stroke="#2a1c14" strokeWidth="1.2" opacity="0.35" fill="none" />
    </svg>
  )
}
