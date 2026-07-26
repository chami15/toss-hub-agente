import type { EstadoEditor } from './edicao'

// O HUD do modo de edição. Some quando o modo está desligado — só
// sobra a dica da tecla, pra não poluir a maquete.

const CANTO: React.CSSProperties = {
  position: 'absolute',
  left: 16,
  top: 16,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
  color: '#e6e1d6',
  userSelect: 'none',
}

const CARTAO: React.CSSProperties = {
  ...CANTO,
  width: 340,
  background: 'rgba(20, 22, 27, 0.92)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const ROTULO: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#8d8779',
}

const BOTAO: React.CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 5,
  color: '#e6e1d6',
  font: 'inherit',
  fontSize: 11,
  padding: '6px 8px',
  cursor: 'pointer',
}

interface Props {
  estado: EstadoEditor
  descricao: string
  codigo: string
  aoCopiar: () => void
  aoCiclar: (passos: number) => void
  aoRestaurar: () => void
}

export function PainelEdicao({ estado, descricao, codigo, aoCopiar, aoCiclar, aoRestaurar }: Props) {
  if (!estado.ativo) {
    return (
      <div style={{ ...CANTO, opacity: 0.5 }}>
        <kbd>E</kbd> — modo de edição
      </div>
    )
  }

  return (
    <div style={CARTAO}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong style={{ color: '#4ade80', letterSpacing: '0.06em' }}>MODO EDIÇÃO</strong>
        <span style={{ ...ROTULO, color: '#8d8779' }}>
          {estado.mexidos > 0 ? `${estado.mexidos} movidos` : 'nada movido'}
        </span>
      </div>

      <div>
        <div style={ROTULO}>peça selecionada</div>
        <div style={{ fontSize: 14, marginTop: 3 }}>
          {estado.selecionado?.info.rotulo ?? '—'}
        </div>
        <div style={{ color: '#a89f8c', marginTop: 3 }}>{descricao}</div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button style={BOTAO} onClick={() => aoCiclar(-1)}>
          ‹ anterior
        </button>
        <button style={BOTAO} onClick={() => aoCiclar(1)}>
          próxima ›
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button style={BOTAO} onClick={aoRestaurar}>
          desfazer esta
        </button>
        <button
          style={{ ...BOTAO, background: 'rgba(74,222,128,0.16)', borderColor: 'rgba(74,222,128,0.4)' }}
          onClick={aoCopiar}
        >
          copiar código
        </button>
      </div>

      <div>
        <div style={ROTULO}>passo do teclado · {estado.passo}</div>
        <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', color: '#a89f8c', lineHeight: 1.7 }}>
          <li>arrastar com o mouse · mover livre</li>
          <li>setas · mover pelo passo</li>
          <li>Tab · próxima peça &nbsp; [ ] · passo</li>
          <li>R · desfazer &nbsp; Shift+R · desfazer tudo</li>
          <li>C · copiar código &nbsp; E · sair</li>
        </ul>
      </div>

      {estado.mexidos > 0 && (
        <pre
          style={{
            margin: 0,
            maxHeight: 160,
            overflow: 'auto',
            background: 'rgba(0,0,0,0.35)',
            borderRadius: 5,
            padding: 8,
            fontSize: 10.5,
            lineHeight: 1.5,
            color: '#c9c2b2',
            whiteSpace: 'pre',
          }}
        >
          {codigo}
        </pre>
      )}
    </div>
  )
}
