import type { EstadoEditor } from './edicao'
import { rotuloDe } from './catalogo'
import { AGENTES } from './agentes'

// HUD do modo de edição. Some quando o modo está desligado — só sobra
// a dica da tecla, pra não poluir a maquete.

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

const DICA: React.CSSProperties = {
  position: 'absolute',
  left: 16,
  top: 16,
  fontFamily: MONO,
  fontSize: 12,
  color: '#e6e1d6',
  opacity: 0.5,
  userSelect: 'none',
}

const CARTAO: React.CSSProperties = {
  position: 'absolute',
  left: 16,
  top: 16,
  width: 260,
  fontFamily: MONO,
  fontSize: 12,
  color: '#e6e1d6',
  background: 'rgba(20, 22, 27, 0.93)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  userSelect: 'none',
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

const VERDE: React.CSSProperties = {
  ...BOTAO,
  background: 'rgba(74,222,128,0.16)',
  borderColor: 'rgba(74,222,128,0.4)',
}

interface Props {
  estado: EstadoEditor
  aoRemover: () => void
  aoGirar: () => void
  aoApoiar: () => void
  aoAtribuirAgente: (id: string | null) => void
  aoSalvarRascunho: () => void
  aoVoltarParaFonte: () => void
  aoCopiarJson: () => void
}

export function PainelEdicao({
  estado,
  aoRemover,
  aoGirar,
  aoApoiar,
  aoAtribuirAgente,
  aoSalvarRascunho,
  aoVoltarParaFonte,
  aoCopiarJson,
}: Props) {
  if (!estado.ativo) {
    return (
      <div style={DICA}>
        <kbd>E</kbd> — modo de edição
      </div>
    )
  }

  const sel = estado.selecionado

  return (
    <div style={CARTAO}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong style={{ color: '#4ade80', letterSpacing: '0.06em' }}>MODO EDIÇÃO</strong>
        <span style={ROTULO}>{estado.totalMoveis} móveis</span>
      </div>

      <div
        style={{
          ...ROTULO,
          color: estado.sujo ? '#dbb15f' : '#8d8779',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: 8,
        }}
      >
        {estado.camada === 'rascunho' ? 'rascunho salvo' : 'fonte (git)'}
        {estado.sujo && ' · alterado'}
      </div>

      <div>
        <div style={ROTULO}>selecionado</div>
        {sel ? (
          <>
            <div style={{ fontSize: 13, marginTop: 3 }}>{rotuloDe(sel.peca)}</div>
            <div style={{ color: '#a89f8c', marginTop: 2, fontSize: 11 }}>
              {sel.direcao} · {sel.coluna.toFixed(2)}, {sel.linha.toFixed(2)}
              {sel.altura ? ` · alt ${sel.altura}` : ''}
              {sel.sobre ? ' · apoiado' : ''}
            </div>
          </>
        ) : (
          <div style={{ color: '#8d8779', marginTop: 3 }}>clique numa peça</div>
        )}
      </div>

      {sel && (
        <>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={BOTAO} onClick={aoGirar}>
              girar
            </button>
            <button style={BOTAO} onClick={aoApoiar}>
              {sel.sobre ? 'soltar' : 'apoiar'}
            </button>
            <button style={{ ...BOTAO, flex: 0.7 }} onClick={aoRemover}>
              excluir
            </button>
          </div>

          <div>
            <div style={ROTULO}>agente nesta peça</div>
            <select
              value={sel.agente ?? ''}
              onChange={(e) => aoAtribuirAgente(e.target.value || null)}
              style={{
                width: '100%',
                marginTop: 4,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 5,
                color: '#e6e1d6',
                font: 'inherit',
                fontSize: 11,
                padding: '5px 6px',
              }}
            >
              <option value="">— ninguém —</option>
              {AGENTES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button style={VERDE} onClick={aoSalvarRascunho}>
          salvar rascunho
        </button>
        <button style={BOTAO} onClick={aoCopiarJson}>
          copiar JSON
        </button>
      </div>
      <button style={BOTAO} onClick={aoVoltarParaFonte}>
        descartar e voltar à fonte
      </button>

      <div>
        <div style={ROTULO}>passo · {estado.passo}</div>
        <ul
          style={{
            margin: '6px 0 0',
            padding: 0,
            listStyle: 'none',
            color: '#a89f8c',
            lineHeight: 1.7,
            fontSize: 11,
          }}
        >
          <li>arrastar · mover livre</li>
          <li>setas · mover pelo passo</li>
          <li>Q E · girar &nbsp; Tab · próxima</li>
          <li>PgUp PgDn · altura</li>
          <li>[ ] · passo &nbsp; Del · excluir</li>
          <li>E · sair</li>
        </ul>
      </div>
    </div>
  )
}
