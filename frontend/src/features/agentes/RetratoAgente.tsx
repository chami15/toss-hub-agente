import { PASTA_AGENTES, RECORTES, type AgenteVisual } from '../escritorio/agentes'

// O mesmo crachá circular do escritório, só que em DOM em vez de Pixi.
//
// Reusa as MESMAS constantes de RECORTES (cx, cy, raio) que cena.ts usa
// pra recortar o retrato no canvas — os 4 retratos têm enquadramento
// diferente, e calibrar isso duas vezes garantiria que um dia os dois
// lados divergissem sem ninguém notar.
//
// A conta é a tradução direta do que o Pixi faz:
//   Pixi:  sprite.anchor.set(cx, cy);  escala = raioTela / (raio * larguraOriginal)
//   DOM:   left/top 50% + translate(-cx*100%, -cy*100%);  largura = raioTela / raio
//
// Funciona porque porcentagem em `translate` é relativa ao tamanho do
// PRÓPRIO elemento — que é exatamente a semântica de `anchor` do Pixi.

export function corCss(cor: number): string {
  return `#${cor.toString(16).padStart(6, '0')}`
}

interface Props {
  agente: AgenteVisual
  /** diâmetro do círculo, em px */
  tamanho: number
  /** espessura do anel colorido em volta; 0 remove o anel */
  anel?: number
}

export function RetratoAgente({ agente, tamanho, anel = 3 }: Props) {
  const recorte = RECORTES[agente.id]
  // sem recorte medido, mostra o retrato inteiro encolhido em vez de
  // sumir com ele — degradar é melhor que não desenhar nada
  const larguraImagem = recorte ? tamanho / 2 / recorte.raio : tamanho
  const deslocX = recorte ? recorte.cx * 100 : 50
  const deslocY = recorte ? recorte.cy * 100 : 50

  return (
    <div
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        boxSizing: 'border-box',
        border: anel > 0 ? `${anel}px solid ${corCss(agente.cor)}` : undefined,
        background: 'rgba(0,0,0,0.25)',
      }}
    >
      <img
        src={`${PASTA_AGENTES}/${agente.arquivo}`}
        alt={agente.nome}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: larguraImagem,
          maxWidth: 'none',
          transform: `translate(-${deslocX}%, -${deslocY}%)`,
        }}
      />
    </div>
  )
}
