import { useMemo, useState } from 'react'
import { useAgentes } from '../../hooks/useAgentes'
import { useMensagens, useResponderMensagem } from '../../hooks/useMensagens'
import { mensagemDeErro } from '../../api/client'
import { AGENTES } from '../escritorio/agentes'
import { corCss } from './RetratoAgente'
import type { Mensagem } from '../../types/mensagens'

// "Caixa de mensagens do chefe" (docs/frontend-design.md, módulo de
// interação) — uma thread por colega, no estilo DM/e-mail, em vez de um
// feed único misturado. Existe pra ler o que os agentes falaram COM o
// chefe (proatividade de trabalho e papo social) e responder o social.
//
// NÃO usa GET /mensagens/caixa-de-entrada. Esse endpoint filtra por
// `destinatario_id = chefe`, então devolve só o que CHEGA — a resposta
// que o próprio chefe manda (`destinatario_id` = o AGENTE) fica de fora,
// e uma "conversa" sem o lado do chefe é só metade de uma conversa. O
// mural (`GET /mensagens`, sem filtro de participante) tem as duas
// pontas; aqui ele é filtrado no CLIENTE pra só o que envolve o chefe —
// mais fetch que precisaria, mas o único jeito de montar um balão de
// citação de duas vias sem inventar um endpoint novo.

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const COR_TRABALHO = '#dbb15f'

const BACKDROP: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(10, 12, 16, 0.55)',
  zIndex: 55,
}

const PAINEL: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 0,
  bottom: 0,
  width: 'min(56vw, 720px)',
  fontFamily: MONO,
  color: '#e6e1d6',
  background: 'rgba(20, 22, 27, 0.97)',
  borderLeft: '1px solid rgba(255,255,255,0.16)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 60,
}

const CABECALHO: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px',
  background: 'rgba(255,255,255,0.04)',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontSize: 12,
  color: '#8d8779',
}

const BOTAO_FECHAR: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#e6e1d6',
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
  padding: 4,
}

const BOTAO: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 5,
  color: '#e6e1d6',
  font: 'inherit',
  fontSize: 11,
  padding: '5px 9px',
  cursor: 'pointer',
}

const LINK: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#8d8779',
  font: 'inherit',
  fontSize: 10.5,
  padding: 0,
  cursor: 'pointer',
}

const CAMPO_RESPOSTA: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: '#20232a',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 5,
  color: '#e6e1d6',
  font: 'inherit',
  fontSize: 11.5,
  padding: '6px 8px',
  colorScheme: 'dark',
}

const ERRO: React.CSSProperties = {
  color: '#f0b7ab',
  fontSize: 11,
  lineHeight: 1.5,
}

function truncar(texto: string, max: number): string {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto
}

interface Conversa {
  outroId: number
  outroNome: string
  // ascendente por id — ordem de leitura de uma conversa
  mensagens: Mensagem[]
}

// Agrupa o mural (que traz TODO par) só nas mensagens que tocam o
// chefe, uma conversa por interlocutor — é aqui que "feed único" vira
// "uma thread por colega" (decisão de design registrada no guia).
function agruparPorConversa(mensagens: Mensagem[], chefeId: number): Conversa[] {
  const porOutro = new Map<number, { nome: string; mensagens: Mensagem[] }>()

  for (const m of mensagens) {
    if (m.remetente_id !== chefeId && m.destinatario_id !== chefeId) continue
    const outroId = m.remetente_id === chefeId ? m.destinatario_id : m.remetente_id
    const outroNome = m.remetente_id === chefeId ? m.destinatario_nome : m.remetente_nome
    if (outroId == null) continue
    const entrada = porOutro.get(outroId) ?? { nome: outroNome ?? `agente ${outroId}`, mensagens: [] }
    entrada.mensagens.push(m)
    porOutro.set(outroId, entrada)
  }

  const conversas = [...porOutro.entries()].map(([outroId, { nome, mensagens: doOutro }]) => {
    doOutro.sort((a, b) => a.id - b.id)
    return { outroId, outroNome: nome, mensagens: doOutro }
  })
  conversas.sort((a, b) => b.mensagens.at(-1)!.id - a.mensagens.at(-1)!.id)
  return conversas
}

export function PainelCaixaDeEntrada({ aoFechar }: { aoFechar: () => void }) {
  const { data: agentes } = useAgentes()
  const { data: mensagens, isLoading, error } = useMensagens()
  const responder = useResponderMensagem()
  const [abertas, setAbertas] = useState<Set<number>>(new Set())
  const [respondendoId, setRespondendoId] = useState<number | null>(null)
  const [texto, setTexto] = useState('')

  const chefeId = agentes?.find((a) => a.tipo === 'chefe')?.id

  const conversas = useMemo(() => {
    if (!mensagens || chefeId == null) return []
    return agruparPorConversa(mensagens, chefeId)
  }, [mensagens, chefeId])

  function alternar(id: number) {
    setAbertas((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  function abrirResposta(mensagemId: number) {
    setRespondendoId(mensagemId)
    setTexto('')
  }

  function enviarResposta(mensagemId: number) {
    const conteudo = texto.trim()
    if (!conteudo) return
    responder.mutate(
      { mensagemId, conteudo },
      { onSuccess: () => { setRespondendoId(null); setTexto('') } },
    )
  }

  return (
    <>
      <div onClick={aoFechar} style={BACKDROP} />
      <div style={PAINEL}>
        <header style={CABECALHO}>
          <span>caixa de entrada</span>
          <button style={BOTAO_FECHAR} onClick={aoFechar} aria-label="fechar caixa de entrada">
            ×
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isLoading && <div style={{ color: '#8d8779', fontSize: 12 }}>carregando…</div>}
          {error && <div style={ERRO}>{mensagemDeErro(error)}</div>}
          {!isLoading && !error && conversas.length === 0 && (
            <div style={{ color: '#8d8779', fontSize: 12, lineHeight: 1.7 }}>
              Nenhuma mensagem ainda — processe uma rodada do tick (relógio, canto inferior
              esquerdo) pra gerar conversa.
            </div>
          )}

          {conversas.map((c) => {
            const visual = AGENTES.find((a) => a.nome === c.outroNome)
            const cor = visual ? corCss(visual.cor) : '#8d8779'
            const ultima = c.mensagens.at(-1)!
            const aberta = abertas.has(c.outroId)

            return (
              <div
                key={c.outroId}
                style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}
              >
                <button
                  onClick={() => alternar(c.outroId)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: 'none',
                    color: '#e6e1d6',
                    font: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cor, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5 }}>{c.outroNome}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#8d8779',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {truncar(ultima.conteudo, 64)}
                    </div>
                  </span>
                  <span style={{ color: '#8d8779', fontSize: 11 }}>{aberta ? '▾' : '▸'}</span>
                </button>

                {aberta && (
                  <div
                    style={{
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {c.mensagens.map((msg) => {
                      const doChefe = msg.remetente_id === chefeId
                      const podeResponder = msg.tipo === 'social' && !doChefe

                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: doChefe ? 'flex-end' : 'flex-start',
                            gap: 3,
                          }}
                        >
                          <div
                            style={{
                              maxWidth: '85%',
                              padding: '8px 11px',
                              borderRadius: 10,
                              fontSize: 12,
                              lineHeight: 1.5,
                              whiteSpace: 'pre-wrap',
                              background: doChefe ? 'rgba(255,255,255,0.1)' : `${cor}22`,
                              border: msg.tipo === 'trabalho' ? `1px solid ${COR_TRABALHO}` : '1px solid transparent',
                            }}
                          >
                            {msg.tipo === 'trabalho' && (
                              <div
                                style={{
                                  fontSize: 9,
                                  letterSpacing: '0.08em',
                                  textTransform: 'uppercase',
                                  color: COR_TRABALHO,
                                  marginBottom: 4,
                                }}
                              >
                                trabalho
                              </div>
                            )}
                            {msg.respondendo_a_id != null && (
                              <div
                                style={{
                                  fontSize: 10.5,
                                  opacity: 0.7,
                                  borderLeft: '2px solid rgba(255,255,255,0.25)',
                                  paddingLeft: 6,
                                  marginBottom: 5,
                                }}
                              >
                                ↩ {msg.respondendo_a_remetente_nome}: {truncar(msg.respondendo_a_conteudo ?? '', 80)}
                              </div>
                            )}
                            {msg.conteudo}
                          </div>

                          {podeResponder &&
                            (respondendoId === msg.id ? (
                              <div style={{ display: 'flex', gap: 6, width: '100%', maxWidth: '85%' }}>
                                <input
                                  autoFocus
                                  style={CAMPO_RESPOSTA}
                                  value={texto}
                                  onChange={(e) => setTexto(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') enviarResposta(msg.id)
                                  }}
                                  placeholder={`responder pra ${c.outroNome}…`}
                                />
                                <button style={BOTAO} onClick={() => enviarResposta(msg.id)} disabled={responder.isPending}>
                                  enviar
                                </button>
                                <button style={BOTAO} onClick={() => setRespondendoId(null)}>
                                  ×
                                </button>
                              </div>
                            ) : (
                              <button style={LINK} onClick={() => abrirResposta(msg.id)}>
                                responder
                              </button>
                            ))}
                        </div>
                      )
                    })}

                    {responder.isError && respondendoId != null && <div style={ERRO}>{mensagemDeErro(responder.error)}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
