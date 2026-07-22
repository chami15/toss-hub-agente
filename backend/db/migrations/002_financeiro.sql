-- Migration 002 — domínio do agente Financeiro (Cifra).
-- Decisões desta migration (ver conversa de design do agente Financeiro):
--   * upload manual de extrato (CSV), dois bancos: Itaú e Nubank;
--   * extratos_importados guarda PERÍODO (início/fim), não um mês único,
--     porque um upload pode cobrir vários meses de uma vez;
--   * transacoes tem hash_lancamento UNIQUE (banco+data+valor+descrição crua)
--     pra nunca duplicar linha em reimportação/sobreposição de período;
--   * descricao_bruta (exata do arquivo, usada no hash) é separada de
--     descricao_normalizada (limpa, ajuda a detectar recorrência e fica
--     legível no relatório);
--   * recorrente_tipo distingue assinatura (indefinida) de parcela (tem fim);
--   * relatorios_financeiros guarda só a narrativa gerada pelo LLM — os
--     KPIs/gráficos são calculados ao vivo a partir de transacoes, nunca
--     persistidos (não há por que cachear algo tão barato de agregar).

-- ---------------------------------------------------------------------------
-- Cada upload de extrato (auditoria: quando, qual banco, qual período)
-- ---------------------------------------------------------------------------
CREATE TABLE extratos_importados (
    id                SERIAL PRIMARY KEY,
    banco             TEXT NOT NULL CHECK (banco IN ('itau', 'nubank')),
    nome_arquivo      TEXT,
    periodo_inicio    DATE,
    periodo_fim       DATE,
    total_transacoes  INT NOT NULL DEFAULT 0,
    importado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Transações individuais, uma linha por lançamento do extrato.
-- ---------------------------------------------------------------------------
CREATE TABLE transacoes (
    id                     SERIAL PRIMARY KEY,
    banco                  TEXT NOT NULL CHECK (banco IN ('itau', 'nubank')),
    data                   DATE NOT NULL,
    valor                  NUMERIC(12, 2) NOT NULL,
    tipo                   TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    descricao_bruta        TEXT NOT NULL,       -- exata do arquivo, usada no hash
    descricao_normalizada  TEXT,                -- limpa, ajuda recorrência/relatório
    categoria              TEXT,                -- NULL até a categorização rodar
    recorrente_tipo        TEXT CHECK (recorrente_tipo IN ('assinatura', 'parcela')),
    parcela_atual          SMALLINT,
    parcela_total          SMALLINT,
    hash_lancamento        TEXT NOT NULL UNIQUE,  -- banco+data+valor+descricao_bruta
    extrato_importado_id   INT REFERENCES extratos_importados(id) ON DELETE SET NULL,
    criado_em              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transacoes_data ON transacoes (data);
CREATE INDEX idx_transacoes_categoria ON transacoes (categoria);
CREATE INDEX idx_transacoes_tipo_data ON transacoes (tipo, data);

-- ---------------------------------------------------------------------------
-- A narrativa gerada pelo agente, uma vez por mês de referência.
-- ---------------------------------------------------------------------------
CREATE TABLE relatorios_financeiros (
    id              SERIAL PRIMARY KEY,
    mes_referencia  DATE NOT NULL UNIQUE,   -- primeiro dia do mês (ex: 2026-06-01)
    relatorio       JSONB NOT NULL,          -- padroes_identificados, recomendacoes, resumo_textual
    modelo          TEXT,
    tokens_in       INT DEFAULT 0,
    tokens_out      INT DEFAULT 0,
    custo_usd       NUMERIC(10, 6) DEFAULT 0,
    gerado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);
