import { useState } from 'react'
import { categoriasComPecas, miniatura, pecasDaCategoria, rotuloDe } from './catalogo'

// O catálogo das 140 peças do pack. Fica escondido atrás de uma aba
// pra não roubar a tela da maquete — clicar numa peça põe ela no
// centro da sala já selecionada, pronta pra arrastar.

const MONO = 'var(--fonte-display), ui-monospace, SFMono-Regular, Menlo, monospace'

// Superfície de trabalho, não instrumento flutuante — chapa opaca
// (`--deck`) e cantos retos, mesma regra do resto da casa (docs/
// frontend-design.md, "redesenho do HUD"). Era translúcido com cantos
// bem arredondados em tudo; decisão explícita do chefe foi cortar isso.
const PAINEL: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 0,
  bottom: 0,
  width: 300,
  fontFamily: MONO,
  fontSize: 12,
  color: '#e6e1d6',
  background: 'var(--deck)',
  borderLeft: '1px solid var(--deck-line)',
  display: 'flex',
  flexDirection: 'column',
  userSelect: 'none',
}

const ABAS: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
  padding: 10,
  borderBottom: '1px solid var(--deck-line)',
}

const GRADE: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 6,
  padding: 10,
  alignContent: 'start',
}

const CELULA: React.CSSProperties = {
  background: 'var(--deck-2)',
  border: '1px solid var(--deck-line)',
  borderRadius: 4,
  padding: 6,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  color: 'inherit',
  font: 'inherit',
}

interface Props {
  aberto: boolean
  aoAlternar: () => void
  aoAdicionar: (peca: string) => void
}

export function PainelCatalogo({ aberto, aoAlternar, aoAdicionar }: Props) {
  const categorias = categoriasComPecas()
  const [categoria, setCategoria] = useState(categorias[0]?.id ?? 'outros')

  if (!aberto) {
    return (
      <button
        onClick={aoAlternar}
        style={{
          position: 'absolute',
          right: 16,
          top: 16,
          fontFamily: MONO,
          fontWeight: 600,
          fontSize: 12,
          background: 'var(--deck-2)',
          border: '1px solid var(--deck-line)',
          borderRadius: 6,
          color: '#e6e1d6',
          padding: '7px 12px',
          cursor: 'pointer',
        }}
      >
        catálogo
      </button>
    )
  }

  const pecas = pecasDaCategoria(categoria)

  return (
    <div style={PAINEL}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 12px 0',
        }}
      >
        <strong style={{ letterSpacing: '0.06em', color: '#4ade80' }}>CATÁLOGO</strong>
        <button
          onClick={aoAlternar}
          style={{
            background: 'none',
            border: 'none',
            color: '#8d8779',
            font: 'inherit',
            fontSize: 16,
            cursor: 'pointer',
          }}
          aria-label="fechar catálogo"
        >
          ×
        </button>
      </div>

      <div style={ABAS}>
        {categorias.map((c) => (
          <button
            key={c.id}
            className="console-aba"
            data-ativo={c.id === categoria}
            onClick={() => setCategoria(c.id)}
            style={{
              background: 'var(--deck-2)',
              border: '1px solid var(--deck-line)',
              borderRadius: 4,
              color: c.id === categoria ? '#e6e1d6' : '#8d8779',
              font: 'inherit',
              fontSize: 10.5,
              padding: '4px 7px',
              cursor: 'pointer',
            }}
          >
            {c.nome}
          </button>
        ))}
      </div>

      <div style={GRADE}>
        {pecas.map((p) => (
          <button key={p} className="catalogo-celula" style={CELULA} onClick={() => aoAdicionar(p)} title={rotuloDe(p)}>
            <img
              src={miniatura(p)}
              alt=""
              style={{
                width: '100%',
                height: 52,
                objectFit: 'contain',
                border: '1px solid var(--deck-line)',
                borderRadius: 3,
                background: 'rgba(0,0,0,0.2)',
              }}
            />
            <span
              style={{
                fontSize: 9,
                color: '#a89f8c',
                textAlign: 'center',
                lineHeight: 1.25,
                overflowWrap: 'anywhere',
              }}
            >
              {rotuloDe(p)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
