import type { Agente } from '../../../types/agente'
import { Avatar } from './Avatar'

// Tamanho de exibição do box (a arte original é um quadrado 554x554 —
// mantemos a proporção 1:1 e só escalamos pra baixo).
const TAMANHO_ORIGINAL = 554
const TAMANHO_EXIBIDO = 340

// Posição de cada cadeira dentro da arte, calibrada visualmente (em
// pixels da viewBox original 554x554) abrindo o SVG isolado e sobrepondo
// uma grade. Ordem: [cima-esq, cima-dir, baixo-esq, baixo-dir].
const POSICOES_CADEIRA = [
  { x: 150, y: 155 }, // cima-esq
  { x: 400, y: 140 }, // cima-dir
  { x: 170, y: 375 }, // baixo-esq
  { x: 375, y: 360 }, // baixo-dir
]

// Converte uma coordenada da arte original (0–554) pra porcentagem do
// container — assim o overlay acompanha a imagem mesmo se a gente mudar
// TAMANHO_EXIBIDO depois.
function paraPorcentagem(valor: number) {
  return `${(valor / TAMANHO_ORIGINAL) * 100}%`
}

// Um box de 4 mesas no formato "+", usando a arte pronta (Recraft) como
// imagem estática de fundo — mesas, cadeiras, monitores já vêm desenhados
// no SVG. Só o avatar de cada agente (dinâmico: cor + estado) é
// renderizado por cima, em React, posicionado sobre a cadeira certa.
export function BoxDeMesas({ slots }: { slots: (Agente | null)[] }) {
  return (
    <div
      style={{
        position: 'relative',
        width: TAMANHO_EXIBIDO,
        height: TAMANHO_EXIBIDO,
      }}
    >
      <img
        src="/boxMesas.svg"
        alt=""
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {slots.map((agente, i) => {
        if (!agente) return null
        const pos = POSICOES_CADEIRA[i]
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: paraPorcentagem(pos.x),
              top: paraPorcentagem(pos.y),
              transform: 'translate(-50%, -50%)',
            }}
          >
            <Avatar agente={agente} />
          </div>
        )
      })}
    </div>
  )
}
