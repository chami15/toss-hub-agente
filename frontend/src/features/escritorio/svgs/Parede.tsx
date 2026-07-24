import { paraTela, ALTURA_PAREDE } from '../iso'
import { PAREDES } from '../mapa'

// Paredes de fundo: cada segmento vem da planta (mapa.ts) e é
// desenhado a partir da própria linha do piso, extrudado pra cima —
// nada de clip-path com porcentagens chutadas. Duas cores por zona
// (saguão azul-acinzentado, lounge mostarda), cada uma com um rodapé
// mais claro.
const CORES: Record<'saguao' | 'lounge', { topo: string; rodape: string }> = {
  saguao: { topo: '#6b7d82', rodape: '#ece4d3' },
  lounge: { topo: '#a3821f', rodape: '#f0d9a0' },
}
const ESPESSURA_RODAPE = 14

export function Parede() {
  return (
    <>
      {PAREDES.map((seg, i) => {
        const cor = CORES[seg.zona]
        const pInicio = seg.tipo === 'norte' ? paraTela(seg.de, seg.fixo) : paraTela(seg.fixo, seg.de)
        const pFim = seg.tipo === 'norte' ? paraTela(seg.ate, seg.fixo) : paraTela(seg.fixo, seg.ate)

        const topoInicioY = pInicio.y - ALTURA_PAREDE
        const topoFimY = pFim.y - ALTURA_PAREDE
        const rodapeTopoInicioY = pInicio.y - ESPESSURA_RODAPE
        const rodapeTopoFimY = pFim.y - ESPESSURA_RODAPE

        return (
          <g key={i}>
            <polygon
              points={`${pInicio.x},${rodapeTopoInicioY} ${pFim.x},${rodapeTopoFimY} ${pFim.x},${topoFimY} ${pInicio.x},${topoInicioY}`}
              fill={cor.topo}
            />
            <polygon
              points={`${pInicio.x},${pInicio.y} ${pFim.x},${pFim.y} ${pFim.x},${rodapeTopoFimY} ${pInicio.x},${rodapeTopoInicioY}`}
              fill={cor.rodape}
            />
          </g>
        )
      })}
    </>
  )
}
