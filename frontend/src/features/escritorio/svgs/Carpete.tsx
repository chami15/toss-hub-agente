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
          width="18"
          height="18"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(10)"
        >
          <rect width="18" height="18" fill="#57534c" />
          <line x1="2" y1="2" x2="5" y2="9" stroke="#3d3a35" strokeWidth="1.6" strokeLinecap="round" opacity="0.65" />
          <line x1="8" y1="1" x2="10" y2="8" stroke="#6b6760" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
          <line x1="13" y1="4" x2="16" y2="11" stroke="#3d3a35" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <line x1="4" y1="11" x2="7" y2="17" stroke="#6b6760" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
          <line x1="11" y1="12" x2="13" y2="17" stroke="#3d3a35" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
          <line x1="16" y1="13" x2="17" y2="17" stroke="#6b6760" strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
          <line x1="1" y1="14" x2="3" y2="17" stroke="#3d3a35" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#textura-carpete)" />
    </svg>
  )
}
