-- Migration 004 — mecanismo genérico de confirmação humana antes de ação
-- real e irreversível. Não é específico do Agenda: qualquer agente futuro
-- que precise criar/mudar/cancelar algo de verdade passa por aqui — grava
-- a intenção, só executa quando o chefe confirma. Concretiza o princípio
-- que já estava escrito desde o primeiro documento do MVP ("nenhuma ação
-- real irreversível sem confirmação explícita do chefe").

CREATE TABLE acoes_pendentes (
    id            SERIAL PRIMARY KEY,
    agente_id     INT NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
    tipo          TEXT NOT NULL,       -- 'criar_evento', 'mover_evento', 'cancelar_evento'
    descricao     TEXT NOT NULL,       -- texto pro chefe confirmar ("Jantar dia X às Y, confirma?")
    payload       JSONB NOT NULL,      -- dados pra executar se confirmado (data, hora, titulo, evento_id...)
    status        TEXT NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'confirmado', 'rejeitado', 'expirado')),
    resultado     JSONB,               -- resposta da API externa após execução (ex: id do evento criado)
    erro          TEXT,                -- preenchido se a execução falhar após confirmação
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolvido_em  TIMESTAMPTZ
);
CREATE INDEX idx_acoes_pendentes_agente_status ON acoes_pendentes (agente_id, status);
