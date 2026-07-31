import { useState } from 'react'
import { useCriarEventoMundo, useEventosMundo } from '../../hooks/useEventosMundo'
import { mensagemDeErro } from '../../api/client'

// Pool de "ganchos de conversa" (clima, futebol, fim de semana etc.) que
// a rodada social sorteia pra dar assunto pros agentes (Etapa 2 do
// motor de tick, `_sortear_evento_mundo`) — sem geração automática por
// LLM, é curado pelo chefe. Doc já fecha o escopo desta tela: só
// adicionar/listar, sem editar/remover na primeira versão.
//
// Fica recolhido por padrão (mesmo padrão do toggle "rodada do tick" no
// relógio) — curar eventos é raro, ao contrário de avançar o relógio.

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

const CARTAO: React.CSSProperties = {
  position: 'absolute',
  right: 16,
  bottom: 16,
  width: 236,
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

const LINK: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#8d8779',
  font: 'inherit',
  fontSize: 11,
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
}

const CAMPO: React.CSSProperties = {
  width: '100%',
  background: '#20232a',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 5,
  color: '#e6e1d6',
  font: 'inherit',
  fontSize: 11,
  padding: '5px 6px',
  colorScheme: 'dark',
}

const BOTAO: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 5,
  color: '#e6e1d6',
  font: 'inherit',
  fontSize: 11,
  padding: '6px 8px',
  cursor: 'pointer',
}

const VERDE: React.CSSProperties = { ...BOTAO, flex: 1, background: 'rgba(74,222,128,0.16)', borderColor: 'rgba(74,222,128,0.4)' }

const ERRO: React.CSSProperties = { color: '#f0b7ab', fontSize: 11, lineHeight: 1.5 }

const DESCRICAO_MAX = 200

export function PainelEventosMundo() {
  const [aberto, setAberto] = useState(false)

  return (
    <div style={CARTAO}>
      <button style={LINK} onClick={() => setAberto((v) => !v)}>
        {aberto ? '▾' : '▸'} eventos do mundo
      </button>
      {aberto && <Conteudo />}
    </div>
  )
}

function Conteudo() {
  const { data: eventos, isLoading, error } = useEventosMundo()
  const criar = useCriarEventoMundo()
  const [descricao, setDescricao] = useState('')

  function adicionar(e: React.FormEvent) {
    e.preventDefault()
    const texto = descricao.trim()
    if (!texto) return
    criar.mutate(texto, { onSuccess: () => setDescricao('') })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={ROTULO}>pool ({eventos?.length ?? 0})</div>

      {isLoading && <div style={{ color: '#8d8779', fontSize: 11 }}>carregando…</div>}
      {error && <div style={ERRO}>{mensagemDeErro(error)}</div>}

      {eventos && eventos.length > 0 && (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            maxHeight: 140,
            overflowY: 'auto',
          }}
        >
          {eventos.map((ev) => (
            <li key={ev.id} style={{ fontSize: 11, lineHeight: 1.4, color: '#e6e1d6' }} title={ev.descricao}>
              {/* nunca usado ainda é a informação que decide a prioridade
                  do sorteio (ver sql/eventos_mundo.sql), então vale mostrar */}
              {(ev.ultimo_uso_tick ?? null) === null && <span style={{ color: '#4ade80' }}>· </span>}
              {ev.descricao}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={adicionar} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input
          style={CAMPO}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="ex: previsão de chuva forte pra hoje"
          maxLength={DESCRICAO_MAX}
        />
        {criar.isError && <div style={ERRO}>{mensagemDeErro(criar.error)}</div>}
        <button type="submit" style={VERDE} disabled={criar.isPending || !descricao.trim()}>
          {criar.isPending ? 'adicionando…' : '+ adicionar evento'}
        </button>
      </form>
    </div>
  )
}
