-- Migration 006 — domínio do agente Norte (projetos/cards no GitHub).
-- Decisões desta migration (ver conversa de design do agente Norte):
--   * single-user, igual todo o resto do hub — sem tabela de permissão
--     multi-pessoa (ver docs/backlog-futuro.md pra quando isso mudar);
--   * `projetos.status` é só o que o chefe decide deliberadamente
--     (ativo/pausado/concluido/abandonado) — SEMPRE reabrível (é só um
--     UPDATE), nunca um estado travado pra sempre. "Estagnado" NÃO é um
--     valor guardado aqui — é calculado na hora (tempo desde o último
--     card resolvido/commit), mesmo espírito do TTL de pendência do
--     Agenda;
--   * `descricao`/`stack`/`arquitetura_resumo` são gerados 1x no cadastro
--     (scan inicial) e ficam pequenos de propósito — o resto do contexto
--     (commits novos, arquivos mudados) é buscado ao vivo na hora de
--     gerar um card, nunca fica duplicado/guardado aqui;
--   * `ultimo_commit_sha` é o ponteiro de até onde já analisamos — evita
--     reprocessar o repositório inteiro a cada card;
--   * `cards.arquivos_afetados` é NOT NULL e não pode ser vazio — nunca
--     uma sugestão vaga tipo "melhorar o botão", sempre um path concreto;
--   * só existe 1 card NÃO-terminado (`sugerido`/`aceito`) por projeto
--     por vez — o índice único parcial abaixo é o mesmo truque já usado
--     em `acoes_pendentes` (Agenda) e `planos_dieta`/`ficha_treino_dias`
--     (Saúde), aqui reaplicado. O resolver TAMBÉM checa isso antes de
--     chamar o LLM (nunca gasta token só pra descobrir depois que já
--     existe) — essa constraint é só o backstop;
--   * `origem` distingue card sugerido pelo agente de card criado na mão
--     pelo chefe — ambos respeitam a mesma regra de "só 1 ativo por vez";
--   * colunas de custo (modelo/tokens/custo_usd) só fazem sentido pra
--     origem='agente' — ficam NULL/0 pra card manual.

-- ---------------------------------------------------------------------------
-- Projetos rastreados (cada um aponta pra um repositório do GitHub).
-- ---------------------------------------------------------------------------
CREATE TABLE projetos (
    id                  SERIAL PRIMARY KEY,
    nome                TEXT NOT NULL,
    repositorio_url     TEXT NOT NULL UNIQUE,
    repositorio_owner   TEXT NOT NULL,
    repositorio_nome    TEXT NOT NULL,
    descricao           TEXT,
    stack               TEXT[],
    arquitetura_resumo  TEXT,
    ultimo_commit_sha   TEXT,
    status              TEXT NOT NULL DEFAULT 'ativo'
                          CHECK (status IN ('ativo', 'pausado', 'concluido', 'abandonado')),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Cards — a unidade de sugestão/tarefa. Só 1 não-terminado por projeto.
-- ---------------------------------------------------------------------------
CREATE TABLE cards (
    id                SERIAL PRIMARY KEY,
    projeto_id        INT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    tipo              TEXT NOT NULL CHECK (tipo IN ('feature', 'bug', 'refatoracao', 'proximo_passo')),
    titulo            TEXT NOT NULL,
    descricao         TEXT NOT NULL,
    arquivos_afetados TEXT[] NOT NULL CHECK (cardinality(arquivos_afetados) > 0),
    origem            TEXT NOT NULL DEFAULT 'agente' CHECK (origem IN ('agente', 'manual')),
    status            TEXT NOT NULL DEFAULT 'sugerido'
                        CHECK (status IN ('sugerido', 'aceito', 'rejeitado', 'finalizado')),
    modelo            TEXT,
    tokens_in         INT DEFAULT 0,
    tokens_out        INT DEFAULT 0,
    custo_usd         NUMERIC(10, 6) DEFAULT 0,
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolvido_em      TIMESTAMPTZ
);
CREATE INDEX idx_cards_projeto ON cards (projeto_id);
CREATE INDEX idx_cards_status ON cards (status);
-- Só 1 card NÃO-terminado (sugerido/aceito) por projeto por vez.
CREATE UNIQUE INDEX idx_cards_ativo_por_projeto ON cards (projeto_id) WHERE status IN ('sugerido', 'aceito');
