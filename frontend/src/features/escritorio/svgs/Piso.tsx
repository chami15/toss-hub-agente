import { paraTela, TILE_W, TILE_H } from '../iso'
import { MAPA_PISO, type ZonaPiso } from '../mapa'

// Piso do escritório: cada tile é um losango desenhado a partir da
// planta em mapa.ts (não mais um <pattern> infinito) — permite zonas
// com cores diferentes (saguão bege/cinza, lounge terracota) e um
// contorno de verdade (a planta em L), coisa que um pattern não faz.
const CORES: Record<Exclude<ZonaPiso, null>, { claro: string; escuro: string; grude: string }> = {
  saguao: { claro: '#a8a9a6', escuro: '#989995', grude: '#8f908c' },
  lounge: { claro: '#c97a4a', escuro: '#bd6f40', grude: '#8a4d2a' },
}

// A "fundação": mesma silhueta do piso, repetida um pouco mais abaixo
// e atrás de cada tile — como as tiles cobrem a maior parte umas das
// outras, só a borda externa da planta mostra essa cor por baixo,
// criando o degrau bordô que separa a construção do vazio.
const COR_FUNDACAO = '#4a2020'
const ALTURA_FUNDACAO = 16

function pontosLosango(cx: number, cy: number): string {
  const hw = TILE_W / 2
  const hh = TILE_H / 2
  return `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`
}

export function Piso() {
  const tiles: { coluna: number; linha: number; zona: Exclude<ZonaPiso, null> }[] = []
  MAPA_PISO.forEach((linhaZonas, linha) => {
    linhaZonas.forEach((zona, coluna) => {
      if (zona) tiles.push({ coluna, linha, zona })
    })
  })

  return (
    <>
      {tiles.map(({ coluna, linha }) => {
        const { x, y } = paraTela(coluna, linha)
        return (
          <polygon
            key={`fundacao-${coluna}-${linha}`}
            points={pontosLosango(x, y + ALTURA_FUNDACAO)}
            fill={COR_FUNDACAO}
          />
        )
      })}
      {tiles.map(({ coluna, linha, zona }) => {
        const { x, y } = paraTela(coluna, linha)
        const cor = CORES[zona]
        const par = (coluna + linha) % 2 === 0
        return (
          <polygon
            key={`tile-${coluna}-${linha}`}
            points={pontosLosango(x, y)}
            fill={par ? cor.claro : cor.escuro}
            stroke={cor.grude}
            strokeWidth={2}
          />
        )
      })}
    </>
  )
}
