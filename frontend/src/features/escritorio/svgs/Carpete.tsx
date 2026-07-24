// O chão do escritório: um cinza queimado (nem claro nem escuro, com um
// leve tom quente) com uma textura de fiapos repetida via <pattern> SVG —
// dá o ar de carpete peludo sem usar nenhuma imagem/raster. Camada 1 da
// planta: só o piso, de ponta a ponta da tela.
export function Carpete() {
  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0, display: 'block' }}
      preserveAspectRatio="none"
    >
      <defs>
        <pattern
          id="textura-carpete"
          width="22"
          height="22"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(12)"
        >
          <rect width="22" height="22" fill="#6e6a62" />
          <line x1="2" y1="3" x2="4" y2="9" stroke="#5c5952" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
          <line x1="9" y1="1" x2="11" y2="8" stroke="#807c73" strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
          <line x1="15" y1="10" x2="17" y2="17" stroke="#5c5952" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
          <line x1="5" y1="14" x2="7" y2="20" stroke="#807c73" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
          <line x1="18" y1="2" x2="20" y2="7" stroke="#5c5952" strokeWidth="1.1" strokeLinecap="round" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#textura-carpete)" />
    </svg>
  )
}
