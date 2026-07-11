-- Migration 005 — domínio do agente de Saúde (Vita).
-- Decisões desta migration (ver conversa de design do agente de Saúde):
--   * é tudo de UM usuário só (o chefe) — sem tabela de usuário/registro
--     multi-pessoa, diferente do protótipo que inspirou esse agente;
--   * `perfil_saude` é uma linha ÚNICA — o índice único em `(true)` garante
--     isso no próprio banco, não só por convenção de código (truque de
--     "singleton table": só existe uma linha possível pra sempre);
--   * peso NUNCA mora no perfil — vive só em `peso_historico`, pra não
--     duplicar a mesma informação em dois lugares (o perfil guarda só o
--     que é estável: nome, sexo, altura, objetivo, restrições);
--   * idade guardada como `data_nascimento`, nunca número fixo — número
--     fixo fica errado com o tempo (mesmo tipo de bug que achamos no
--     protótipo original, só que pra idade em vez de timestamp);
--   * `ficha_treino_dias` e `planos_dieta` usam o padrão `ativo` (só uma
--     linha ativa por vez, sem apagar as antigas) — mantém histórico pra
--     auditoria/evolução futura, por decisão explícita;
--   * `relatorios_saude.semana_inicio UNIQUE` é a trava de "um relatório
--     por semana" direto no banco — o resolver checa ANTES de chamar o
--     LLM (pra nunca gastar token à toa), essa constraint é só o backstop;
--   * só refeições/plano/relatório têm colunas de custo (modelo, tokens,
--     custo_usd) — são as únicas ações que passam por LLM nesse domínio;
--   * peso, hidratação, sono e atividade são escrita determinística pura,
--     sem custo de token nenhum.

-- ---------------------------------------------------------------------------
-- Perfil de saúde do chefe — linha única.
-- ---------------------------------------------------------------------------
CREATE TABLE perfil_saude (
    id                      SERIAL PRIMARY KEY,
    nome                    TEXT NOT NULL,
    sexo                    TEXT NOT NULL CHECK (sexo IN ('M', 'F')),
    data_nascimento         DATE NOT NULL,
    altura_cm               SMALLINT NOT NULL CHECK (altura_cm > 0),
    objetivo                TEXT NOT NULL
                              CHECK (objetivo IN ('emagrecer', 'ganhar_massa', 'manter_peso', 'saude_geral')),
    tem_diabetes            BOOLEAN NOT NULL DEFAULT FALSE,
    restricoes_alimentares  TEXT,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Trava de singleton: qualquer segunda linha colide com essa expressão
-- constante, então o INSERT com ON CONFLICT ((true)) sempre vira um UPDATE.
CREATE UNIQUE INDEX idx_perfil_saude_singleton ON perfil_saude ((TRUE));

-- ---------------------------------------------------------------------------
-- Peso — histórico simples, sem LLM.
-- ---------------------------------------------------------------------------
CREATE TABLE peso_historico (
    id            SERIAL PRIMARY KEY,
    peso_kg       NUMERIC(5, 2) NOT NULL CHECK (peso_kg > 0),
    registrado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_peso_historico_registrado_em ON peso_historico (registrado_em);

-- ---------------------------------------------------------------------------
-- Hidratação — histórico simples, sem LLM.
-- ---------------------------------------------------------------------------
CREATE TABLE hidratacao_historico (
    id            SERIAL PRIMARY KEY,
    quantidade_ml INT NOT NULL CHECK (quantidade_ml > 0),
    registrado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hidratacao_historico_registrado_em ON hidratacao_historico (registrado_em);

-- ---------------------------------------------------------------------------
-- Sono — histórico simples, sem LLM. `data_referencia` é a noite em si
-- (pode ser registrado de manhã, referente à noite anterior).
-- ---------------------------------------------------------------------------
CREATE TABLE sono_historico (
    id              SERIAL PRIMARY KEY,
    horas           NUMERIC(4, 2) NOT NULL CHECK (horas >= 0 AND horas <= 24),
    qualidade       TEXT CHECK (qualidade IN ('ruim', 'regular', 'boa')),
    data_referencia DATE NOT NULL,
    registrado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sono_historico_data_referencia ON sono_historico (data_referencia);

-- ---------------------------------------------------------------------------
-- Atividade física — histórico simples, sem LLM (forms: tipo + duração).
-- ---------------------------------------------------------------------------
CREATE TABLE atividades_fisicas (
    id            SERIAL PRIMARY KEY,
    tipo          TEXT NOT NULL CHECK (tipo IN ('corrida', 'academia', 'esporte', 'caminhada', 'outro')),
    duracao_min   SMALLINT NOT NULL CHECK (duracao_min > 0),
    observacao    TEXT,
    registrado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_atividades_fisicas_registrado_em ON atividades_fisicas (registrado_em);

-- ---------------------------------------------------------------------------
-- Refeições — a única ação de REGISTRO que passa por LLM (estima macro a
-- partir de foto ou descrição em texto). Só chega numa linha aqui depois
-- que a estimativa + checagem de consistência já deram certo — nunca
-- existe refeição "pela metade" sem macro.
-- ---------------------------------------------------------------------------
CREATE TABLE refeicoes (
    id                    SERIAL PRIMARY KEY,
    tipo_refeicao         TEXT NOT NULL
                            CHECK (tipo_refeicao IN ('cafe_da_manha', 'almoco', 'cafe_da_tarde', 'jantar', 'outro')),
    origem                TEXT NOT NULL CHECK (origem IN ('foto', 'texto')),
    descricao             TEXT NOT NULL,
    imagem_path           TEXT,
    calorias              NUMERIC(6, 1) NOT NULL CHECK (calorias >= 0),
    carboidratos_g        NUMERIC(6, 1) NOT NULL CHECK (carboidratos_g >= 0),
    proteinas_g           NUMERIC(6, 1) NOT NULL CHECK (proteinas_g >= 0),
    gorduras_g            NUMERIC(6, 1) NOT NULL CHECK (gorduras_g >= 0),
    confianca_estimativa  TEXT NOT NULL CHECK (confianca_estimativa IN ('alta', 'media', 'baixa')),
    modelo                TEXT,
    tokens_in             INT DEFAULT 0,
    tokens_out            INT DEFAULT 0,
    custo_usd             NUMERIC(10, 6) DEFAULT 0,
    registrado_em          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refeicoes_registrado_em ON refeicoes (registrado_em);
CREATE INDEX idx_refeicoes_tipo_registrado_em ON refeicoes (tipo_refeicao, registrado_em);

-- ---------------------------------------------------------------------------
-- Ficha de treino — cadastrada pelo próprio chefe (não gerada por LLM
-- ainda, isso fica pra uma fase futura). `ativo` versiona: editar um dia
-- desativa a linha antiga em vez de apagar, os exercícios antigos ficam
-- ligados a ela — histórico completo sem duplicar dado.
-- ---------------------------------------------------------------------------
CREATE TABLE ficha_treino_dias (
    id             SERIAL PRIMARY KEY,
    dia_semana     TEXT NOT NULL
                     CHECK (dia_semana IN ('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo')),
    grupo_muscular TEXT NOT NULL,
    ativo          BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Só uma linha ATIVA por dia da semana; quantas quiser inativas (histórico).
CREATE UNIQUE INDEX idx_ficha_treino_dia_ativo ON ficha_treino_dias (dia_semana) WHERE ativo;

CREATE TABLE ficha_treino_exercicios (
    id             SERIAL PRIMARY KEY,
    dia_ficha_id   INT NOT NULL REFERENCES ficha_treino_dias(id) ON DELETE CASCADE,
    nome_exercicio TEXT NOT NULL,
    series         SMALLINT NOT NULL CHECK (series > 0),
    repeticoes     SMALLINT NOT NULL CHECK (repeticoes > 0),
    ordem          SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_ficha_treino_exercicios_dia ON ficha_treino_exercicios (dia_ficha_id);

-- ---------------------------------------------------------------------------
-- Plano de dieta — gerado pelo LLM a partir do perfil (objetivo, sexo,
-- idade, altura, peso atual, restrições). Mesmo padrão `ativo` da ficha.
-- ---------------------------------------------------------------------------
CREATE TABLE planos_dieta (
    id              SERIAL PRIMARY KEY,
    meta_calorica   INT NOT NULL CHECK (meta_calorica > 0),
    carboidratos_g  INT NOT NULL CHECK (carboidratos_g >= 0),
    proteinas_g     INT NOT NULL CHECK (proteinas_g >= 0),
    gorduras_g      INT NOT NULL CHECK (gorduras_g >= 0),
    orientacoes     TEXT NOT NULL,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    modelo          TEXT,
    tokens_in       INT DEFAULT 0,
    tokens_out      INT DEFAULT 0,
    custo_usd       NUMERIC(10, 6) DEFAULT 0,
    gerado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_planos_dieta_ativo ON planos_dieta ((TRUE)) WHERE ativo;

-- ---------------------------------------------------------------------------
-- Relatório semanal — a narrativa gerada pelo LLM, uma vez por semana.
-- `semana_inicio` é sempre a segunda-feira daquela semana; UNIQUE é a
-- trava de "um relatório por semana" — o resolver checa antes de chamar o
-- LLM, essa constraint aqui é só o backstop.
-- ---------------------------------------------------------------------------
CREATE TABLE relatorios_saude (
    id              SERIAL PRIMARY KEY,
    semana_inicio   DATE NOT NULL UNIQUE,
    relatorio       JSONB NOT NULL,
    modelo          TEXT,
    tokens_in       INT DEFAULT 0,
    tokens_out      INT DEFAULT 0,
    custo_usd       NUMERIC(10, 6) DEFAULT 0,
    gerado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);
