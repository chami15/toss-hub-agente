-- Migration 001 — schema inicial do Hub de Agentes.
-- Ajustes sobre a proposta original (ver docs/avaliacao-mvp.md):
--   * o CHEFE é uma linha em `agentes` (tipo='chefe'), não um NULL solto;
--   * TIMESTAMPTZ (timezone-aware) em tudo;
--   * `tick_execucoes` para replay/auditoria/custo (o que dá controle);
--   * índices e unicidade que faltavam;
--   * `estado` e `mesa` no agente pro front 2D ler direto.

-- ---------------------------------------------------------------------------
-- Agentes (inclui o chefe como uma linha de tipo='chefe')
-- ---------------------------------------------------------------------------
CREATE TABLE agentes (
    id            SERIAL PRIMARY KEY,
    nome          TEXT NOT NULL UNIQUE,
    tipo          TEXT NOT NULL DEFAULT 'colaborador'
                    CHECK (tipo IN ('colaborador', 'chefe')),
    especialidade TEXT NOT NULL,               -- 'financeiro', 'agenda', 'chefe'...
    personalidade TEXT,                        -- prompt base (NULL para o chefe)
    avatar_config JSONB DEFAULT '{}'::jsonb,   -- { "cor": "#..", "rosto": "😎" }
    estado        TEXT NOT NULL DEFAULT 'idle'
                    CHECK (estado IN ('idle', 'pensando', 'falando', 'executando')),
    mesa          SMALLINT,                    -- posição no escritório 2D (id da mesa)
    ativo         BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Memórias de cada agente (texto puro no MVP; pgvector fica pra depois)
-- ---------------------------------------------------------------------------
CREATE TABLE memorias (
    id           SERIAL PRIMARY KEY,
    agente_id    INT NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
    tipo         TEXT NOT NULL DEFAULT 'observacao'
                   CHECK (tipo IN ('observacao', 'reflexao', 'plano')),
    conteudo     TEXT NOT NULL,
    importancia  SMALLINT NOT NULL DEFAULT 1,  -- 1-10, pra futura priorização
    tick_criado  INT,
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_memorias_agente_tick ON memorias (agente_id, tick_criado);

-- ---------------------------------------------------------------------------
-- Relacionamento entre pares (o chefe é um agente, então FK uniforme)
-- ---------------------------------------------------------------------------
CREATE TABLE relacionamentos (
    id             SERIAL PRIMARY KEY,
    agente_id      INT NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
    alvo_agente_id INT NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
    afinidade      SMALLINT NOT NULL DEFAULT 0,  -- -100 a 100
    opiniao        TEXT,                          -- resumo curto, atualizado incrementalmente
    atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (agente_id <> alvo_agente_id),
    UNIQUE (agente_id, alvo_agente_id)
);

-- ---------------------------------------------------------------------------
-- Mensagens (trabalho e social na mesma tabela, separadas por `tipo`)
--   destinatario_id NULL = mensagem "no mural" (todos veem, ex: papo de copa)
-- ---------------------------------------------------------------------------
CREATE TABLE mensagens (
    id              SERIAL PRIMARY KEY,
    remetente_id    INT NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
    destinatario_id INT REFERENCES agentes(id) ON DELETE CASCADE,
    tipo            TEXT NOT NULL CHECK (tipo IN ('trabalho', 'social')),
    conteudo        TEXT NOT NULL,
    tick            INT,
    lida_pelo_chefe BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mensagens_tipo_tick ON mensagens (tipo, tick);
CREATE INDEX idx_mensagens_destinatario_tick ON mensagens (destinatario_id, tick);

-- ---------------------------------------------------------------------------
-- Eventos aleatórios do mundo (munição pra conversa social)
-- ---------------------------------------------------------------------------
CREATE TABLE eventos_mundo (
    id        SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    tick      INT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Relógio simulado. `estado_mundo` guarda snapshot pra replay determinístico.
-- ---------------------------------------------------------------------------
CREATE TABLE ticks (
    id            SERIAL PRIMARY KEY,
    numero        INT NOT NULL UNIQUE,
    hora_simulada TIMESTAMPTZ,
    estado_mundo  JSONB DEFAULT '{}'::jsonb,
    processado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Log de execução por agente por tick — a tabela do CONTROLE.
-- Guarda o que entrou, o que o LLM respondeu, custo e se foi dry-run.
-- Permite replay, auditoria de custo e diagnóstico quando um agente "surta".
-- ---------------------------------------------------------------------------
CREATE TABLE tick_execucoes (
    id              BIGSERIAL PRIMARY KEY,
    tick            INT NOT NULL,
    agente_id       INT NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
    modelo          TEXT,                       -- qual LLM foi usado
    contexto_prompt TEXT,                       -- o que entrou (replay/debug)
    saida_bruta     TEXT,                       -- resposta crua do LLM
    acao_parseada   JSONB,                      -- JSON já validado (ou NULL se falhou)
    tokens_in       INT DEFAULT 0,
    tokens_out      INT DEFAULT 0,
    custo_usd       NUMERIC(10, 6) DEFAULT 0,
    dry_run         BOOLEAN NOT NULL DEFAULT FALSE,
    erro            TEXT,                        -- preenchido se parse/execução falhou
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tick_execucoes_tick ON tick_execucoes (tick);
CREATE INDEX idx_tick_execucoes_custo ON tick_execucoes (criado_em, custo_usd);
