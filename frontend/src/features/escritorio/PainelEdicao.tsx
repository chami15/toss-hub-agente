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

// o popup nativo do <select> não herda estilo do pai — cada <option>
// precisa da própria cor, senão a lista abre branca
const OPCAO: React.CSSProperties = {
  background: '#20232a',
  color: '#e6e1d6',
}

const TOAST: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: 32,
  transform: 'translateX(-50%)',
  fontFamily: MONO,
  fontSize: 12.5,
  color: '#0d1117',
  background: '#4ade80',
  borderRadius: 6,
  padding: '9px 16px',
  boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
  pointerEvents: 'none',
  userSelect: 'none',
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
  aoDesfazer: () => void
  aoRefazer: () => void
  aoApoiar: () => void
  aoAtribuirAgente: (id: string | null) => void
  aoSalvarRascunho: () => void
  aoGravarNaFonte: () => void
  aoVoltarParaFonte: () => void
  aoCopiarJson: () => void
}

export function PainelEdicao({
  estado,
  aoRemover,
  aoGirar,
  aoDesfazer,
  aoRefazer,
  aoApoiar,
  aoAtribuirAgente,
  aoSalvarRascunho,
  aoGravarNaFonte,
  aoVoltarParaFonte,
  aoCopiarJson,
}: Props) {
  // o toast vive fora do cartão: "salvar rascunho" desliga a edição, e
  // a confirmação precisa sobreviver a isso
  const toast = estado.mensagem ? <div style={TOAST}>{estado.mensagem}</div> : null

  if (!estado.ativo) {
    return (
      <>
        <div style={DICA}>
          <kbd>E</kbd> — modo de edição
        </div>
        {toast}
      </>
    )
  }

  const sel = estado.selecionado

  return (
    <>
      {toast}
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
                background: '#20232a',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 5,
                color: '#e6e1d6',
                font: 'inherit',
                fontSize: 11,
                padding: '5px 6px',
                // sem isto a LISTA aberta sai com fundo branco do
                // sistema, ilegível com texto claro. O colorScheme é o
                // que o navegador usa pra pintar o popup nativo.
                colorScheme: 'dark',
              }}
            >
              <option value="" style={OPCAO}>
                — ninguém —
              </option>
              {AGENTES.map((a) => (
                <option key={a.id} value={a.id} style={OPCAO}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          style={{ ...BOTAO, opacity: estado.podeDesfazer ? 1 : 0.4 }}
          onClick={aoDesfazer}
          disabled={!estado.podeDesfazer}
        >
          ↶ desfazer
        </button>
        <button
          style={{ ...BOTAO, opacity: estado.podeRefazer ? 1 : 0.4 }}
          onClick={aoRefazer}
          disabled={!estado.podeRefazer}
        >
          refazer ↷
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button style={VERDE} onClick={aoSalvarRascunho}>
          salvar rascunho
        </button>
        <button style={BOTAO} onClick={aoCopiarJson}>
          copiar JSON
        </button>
      </div>

      {/* só aparece rodando `npm run dev`: num site publicado não
          existe servidor pra gravar o arquivo */}
      {estado.podeGravar && (
        <button
          style={{ ...VERDE, opacity: estado.gravando ? 0.6 : 1 }}
          onClick={aoGravarNaFonte}
          disabled={estado.gravando}
          title="escreve em salas/escritorio.json — depois é só commitar"
        >
          {estado.gravando ? 'gravando…' : 'gravar na fonte (git)'}
        </button>
      )}

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
          <li>Q W · girar &nbsp; Tab · próxima</li>
          <li>A Z · altura</li>
          <li>[ ] · passo &nbsp; Del · excluir</li>
          <li>Ctrl+Z · desfazer &nbsp; Ctrl+Shift+Z · refazer</li>
          <li>E · sair</li>
        </ul>
      </div>
      </div>
    </>
  )
}
