import { useState } from 'react'
import { mensagemDeErro } from '../../api/client'
import { useGerarCard, useProjetos } from '../../hooks/useNorte'
import type { Projeto, StatusProjeto } from '../../types/norte'
import { CardAtivo } from './CardAtivo'
import { AVISO_ERRO, BOTAO, BOTAO_PRINCIPAL, CARTAO, CORPO, ROTULO } from './estilos'
import { FormCardManual } from './FormCardManual'
import { FormProjeto } from './FormProjeto'
import { HistoricoCards } from './HistoricoCards'

// O painel do Norte: um card por vez, por projeto — sem chat e sem lista
// de tarefas. Duas vistas: um quadro (kanban) de projetos e um projeto
// aberto.
//
// O quadro agrupa por STATUS DO PROJETO (ativo/pausado/concluído/
// abandonado) — é a única classificação que já existe pronta (o chefe
// decide isso deliberadamente, ver 006_norte.sql) e que faz sentido como
// coluna: um projeto muda de coluna raramente, do jeito que se espera de
// um quadro, ao contrário do status do CARD (sugerido/aceito/...), que
// muda a toda hora e já tem a própria tela (CardAtivo).

const COLUNAS: { status: StatusProjeto; rotulo: string }[] = [
  { status: 'ativo', rotulo: 'ativo' },
  { status: 'pausado', rotulo: 'pausado' },
  { status: 'concluido', rotulo: 'concluído' },
  { status: 'abandonado', rotulo: 'abandonado' },
]

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

      {projetos && projetos.length > 0 && (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {COLUNAS.map((coluna) => {
            const doGrupo = projetos.filter((p) => p.status === coluna.status)
            return (
              <div key={coluna.status} style={{ flex: '0 0 208px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={ROTULO}>
                  {coluna.rotulo} ({doGrupo.length})
                </div>
                {doGrupo.length === 0 && <div style={{ color: '#6f6a5f', fontSize: 10.5 }}>nenhum</div>}
                {doGrupo.map((p) => (
                  <CardProjeto key={p.id} projeto={p} aoAbrir={() => setVista({ tela: 'projeto', id: p.id })} />
                ))}
              </div>
            )
          })}
        </div>
      )}

      <button style={BOTAO_PRINCIPAL} onClick={() => setVista({ tela: 'novo' })}>
        + cadastrar projeto
      </button>
    </div>
  )
}

function CardProjeto({ projeto, aoAbrir }: { projeto: Projeto; aoAbrir: () => void }) {
  const retomar = useGerarCard(projeto.id)

  return (
    <div style={{ ...CARTAO, opacity: projeto.estagnado ? 0.6 : 1 }}>
      {/* botão próprio, IRMÃO do de "retomar" abaixo — nunca aninhado:
          dois <button> um dentro do outro é HTML inválido e o clique de
          "retomar" borbulharia pro card inteiro */}
      <button
        onClick={aoAbrir}
        style={{
          display: 'block',
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
          font: 'inherit',
          color: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 13.5 }}>{projeto.nome}</span>
        <div style={{ color: '#8d8779', fontSize: 11, marginTop: 3, overflowWrap: 'anywhere' }}>
          {projeto.repositorio_owner}/{projeto.repositorio_nome}
          {projeto.branch && ` · ${projeto.branch}`}
        </div>
        <div style={{ color: '#6f6a5f', fontSize: 10.5, marginTop: 4 }}>
          última atividade {new Date(projeto.atualizado_em).toLocaleDateString('pt-BR')}
        </div>
      </button>

      {projeto.estagnado && (
        <div style={{ marginTop: 8 }}>
          <div style={{ ...ROTULO, marginBottom: 6, color: '#8d8779' }}>estagnado</div>
          <button
            style={{ ...BOTAO, fontSize: 11, width: '100%' }}
            disabled={retomar.isPending}
            onClick={() => retomar.mutate(undefined, { onSuccess: aoAbrir })}
          >
            {retomar.isPending ? 'gerando…' : 'retomar'}
          </button>
          {retomar.isError && <div style={{ ...AVISO_ERRO, marginTop: 6 }}>{mensagemDeErro(retomar.error)}</div>}
        </div>
      )}
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
