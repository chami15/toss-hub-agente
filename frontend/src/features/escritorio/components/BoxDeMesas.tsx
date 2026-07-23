import type { Agente } from '../../../types/agente'
import { Mesa } from './Mesa'

// Um box de 4 mesas no formato "+": 2 mesas em cima (cadeira pra cima) e
// 2 embaixo (cadeira pra baixo), separadas por uma "parede" fina (o gap
// da grade sobre o fundo do box). Recebe os 4 slots já na ordem
// [cima-esq, cima-dir, baixo-esq, baixo-dir]; slot null = cadeira vazia
// (reservada pra um agente futuro).
export function BoxDeMesas({ slots }: { slots: (Agente | null)[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, auto)',
        gridTemplateRows: 'repeat(2, auto)',
        gap: 6, // vira a "parede" em cruz entre as 4 mesas
        background: '#00000012',
        padding: 6,
        borderRadius: 6,
      }}
    >
      {slots.map((agente, i) => (
        <Mesa key={i} agente={agente} orientacao={i < 2 ? 'cima' : 'baixo'} />
      ))}
    </div>
  )
}
