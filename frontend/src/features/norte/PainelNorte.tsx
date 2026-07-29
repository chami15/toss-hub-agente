import { useState } from 'react'
import { mensagemDeErro } from '../../api/client'
import { useProjetos } from '../../hooks/useNorte'
import type { Projeto } from '../../types/norte'
import { CardAtivo } from './CardAtivo'
import { AVISO_ERRO, BOTAO, BOTAO_PRINCIPAL, CARTAO, CORPO, ROTULO } from './estilos'
import { FormCardManual } from './FormCardManual'
import { FormProjeto } from './FormProjeto'
import { HistoricoCards } from './HistoricoCards'

// O painel do Norte: um card por vez, por projeto — sem chat e sem lista
// de tarefas. Duas vistas: a lista de projetos e um projeto aberto.

type Vista = { tela: 'lista' } | { tela: 'novo' } | { tela: 'projeto'; id: number } | { tela: 'card-manual'; id: number }

export function PainelNorte() {
  const [vista, setVista] = useState<Vista>({ tela: 'lista' })
  const { data: projetos, isLoading, error } = useProjetos()

  if (isLoading) return <div style={CORPO}>carregando projetos…</div>
  if (error) {
    return (
      <div style={CORPO}>
        <div style={AVISO_ERRO}>{mensagemDeErro(error)}</div>
        <div style={{ color: '#8d8779', fontSize: 11.5, lineHeight: 1.6 }}>
          O Norte precisa do GitHub autorizado (script manual, fora do app).
          Sem token válido, nada aqui funciona.
        </div>
      </div>
    )
  }

  if (vista.tela === 'novo') {
    return <FormProjeto aoCriar={(id) => setVista({ tela: 'projeto', id })} aoCancelar={() => setVista({ tela: 'lista' })} />
  }

  if (vista.tela === 'card-manual') {
    return (
      <>
        <Cabecalho titulo="novo card" aoVoltar={() => setVista({ tela: 'projeto', id: vista.id })} />
        <FormCardManual
          projetoId={vista.id}
          aoCriar={() => setVista({ tela: 'projeto', id: vista.id })}
          aoCancelar={() => setVista({ tela: 'projeto', id: vista.id })}
        />
      </>
    )
  }

  if (vista.tela === 'projeto') {
    const projeto = projetos?.find((p) => p.id === vista.id)
    if (!projeto) {
      // o projeto sumiu da lista (apagado noutro lugar) — volta em vez de
      // renderizar uma tela vazia sem explicação
      return (
        <div style={CORPO}>
          <div style={AVISO_ERRO}>esse projeto não está mais na lista</div>
          <button style={BOTAO} onClick={() => setVista({ tela: 'lista' })}>
            ← voltar
          </button>
        </div>
      )
    }
    return (
      <>
        <Cabecalho titulo={projeto.nome} aoVoltar={() => setVista({ tela: 'lista' })} />
        <div style={CORPO}>
          <Identidade projeto={projeto} />
          <CardAtivo projetoId={projeto.id} />
          <button
            style={{ ...BOTAO, fontSize: 11 }}
            onClick={() => setVista({ tela: 'card-manual', id: projeto.id })}
          >
            + criar card eu mesmo
          </button>
          <HistoricoCards projetoId={projeto.id} />
        </div>
      </>
    )
  }

  return (
    <div style={CORPO}>
      {(!projetos || projetos.length === 0) && (
        <div style={{ color: '#8d8779', fontSize: 12, lineHeight: 1.7 }}>
          Nenhum projeto cadastrado. Cole o link de um repositório do GitHub e
          o Norte lê o código pra entender do que se trata.
        </div>
      )}

      {projetos && projetos.length > 0 && <div style={ROTULO}>projetos</div>}
      {projetos?.map((p) => (
        <button
          key={p.id}
          style={{ ...CARTAO, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
          onClick={() => setVista({ tela: 'projeto', id: p.id })}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 13.5 }}>{p.nome}</span>
            {p.status !== 'ativo' && <span style={{ ...ROTULO, marginBottom: 0 }}>· {p.status}</span>}
          </div>
          <div style={{ color: '#8d8779', fontSize: 11, marginTop: 3, overflowWrap: 'anywhere' }}>
            {p.repositorio_owner}/{p.repositorio_nome}
            {p.branch && ` · ${p.branch}`}
          </div>
          <div style={{ color: '#6f6a5f', fontSize: 10.5, marginTop: 4 }}>
            última atividade {new Date(p.atualizado_em).toLocaleDateString('pt-BR')}
          </div>
        </button>
      ))}

      <button style={BOTAO_PRINCIPAL} onClick={() => setVista({ tela: 'novo' })}>
        + cadastrar projeto
      </button>
    </div>
  )
}

function Cabecalho({ titulo, aoVoltar }: { titulo: string; aoVoltar: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 0' }}>
      <button style={{ ...BOTAO, fontSize: 11, padding: '4px 10px' }} onClick={aoVoltar}>
        ← voltar
      </button>
      <span style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {titulo}
      </span>
    </div>
  )
}

// Descrição, stack e arquitetura saem de um scan feito UMA vez, no
// cadastro — podem vir nulos se o scan não conseguiu inferir, então cada
// pedaço só aparece quando existe.
function Identidade({ projeto }: { projeto: Projeto }) {
  if (!projeto.descricao && !projeto.stack?.length) return null

  return (
    <div style={CARTAO}>
      {projeto.descricao && (
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: '#c4bdae' }}>{projeto.descricao}</p>
      )}
      {projeto.stack && projeto.stack.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: projeto.descricao ? 10 : 0 }}>
          {projeto.stack.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 10,
                padding: '2px 7px',
                borderRadius: 999,
                background: 'rgba(8,145,178,0.18)',
                border: '1px solid rgba(8,145,178,0.4)',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
