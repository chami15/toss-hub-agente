import type { Agente } from '../../../types/agente'
import { Avatar } from './Avatar'

export type OrientacaoMesa = 'cima' | 'baixo'

interface MesaProps {
  agente?: Agente | null
  orientacao: OrientacaoMesa
}

// Dimensões da "pegada" de uma mesa (desk + cadeira). Constantes no topo
// pra facilitar calibrar o tamanho olhando o resultado.
const LARGURA = 150
const ALTURA = 162

// Uma mesa vista de cima: superfície de madeira, monitor na borda mais
// LONGE da pessoa, teclado/mouse perto dela, e a cadeira do lado de fora.
// Desenhada na orientação "baixo" (pessoa embaixo, olhando pra cima) e,
// pra orientação "cima", a mobília inteira é espelhada com scaleY(-1)
// (transform = acelerado pela GPU). O avatar é posicionado à parte e
// NUNCA espelhado, pra o emoji não virar de cabeça pra baixo.
export function Mesa({ agente, orientacao }: MesaProps) {
  const flip = orientacao === 'cima'
  // Centro da cadeira em cada orientação (a mobília é espelhada em torno
  // do meio vertical, ALTURA/2 = 81).
  const avatarTop = flip ? 24 : ALTURA - 24 - 40

  return (
    <div style={{ position: 'relative', width: LARGURA, height: ALTURA }}>
      <svg
        width={LARGURA}
        height={ALTURA}
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        style={{ transform: flip ? 'scaleY(-1)' : 'none', display: 'block' }}
      >
        {/* sombra sutil por baixo da mesa */}
        <rect x="18" y="14" width="118" height="60" rx="6" fill="#00000018" />
        {/* superfície da mesa (madeira clara) */}
        <rect x="15" y="10" width="120" height="60" rx="6" fill="#c9a26b" />
        <rect x="15" y="10" width="120" height="60" rx="6" fill="none" stroke="#a9814d" strokeWidth="2" />
        {/* monitor (borda mais longe da pessoa) — corpo + tela */}
        <rect x="55" y="16" width="40" height="15" rx="2" fill="#2c2c34" />
        <rect x="59" y="19" width="32" height="9" rx="1" fill="#3e5b72" />
        {/* teclado (perto da pessoa) */}
        <rect x="50" y="46" width="50" height="16" rx="2" fill="#d8d5ce" />
        <rect x="50" y="46" width="50" height="16" rx="2" fill="none" stroke="#bdb9b0" strokeWidth="1" />
        {/* mouse */}
        <ellipse cx="112" cy="54" rx="5" ry="7" fill="#d8d5ce" stroke="#bdb9b0" />

        {/* cadeira (do lado de fora, embaixo) — encosto + assento */}
        <rect x="52" y="112" width="46" height="14" rx="7" fill="#3a3a42" />
        <rect x="57" y="80" width="36" height="34" rx="10" fill="#4a4a52" />
      </svg>

      {/* avatar do agente EM CIMA da cadeira (sempre em pé) */}
      {agente && (
        <div
          style={{
            position: 'absolute',
            left: LARGURA / 2 - 20,
            top: avatarTop,
          }}
        >
          <Avatar agente={agente} />
        </div>
      )}
    </div>
  )
}
