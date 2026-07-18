-- Migration 008 — Etapa 2 do motor de tick (camada social).
-- Duas colunas novas, nenhuma tabela nova (mensagens, relacionamentos e
-- eventos_mundo já existiam reservadas desde a migration 001):
--   * agentes.extroversao: traço fixo por agente (0-10), usado no cálculo
--     de elegibilidade pra puxar assunto social a cada tick (ver conversa
--     de design do módulo de interação, Etapa 2).
--   * eventos_mundo.ultimo_uso_tick: separado do `tick` original (que
--     marca quando o evento foi CRIADO) — este marca a última vez que o
--     evento foi USADO numa mensagem, pra sortear sempre priorizando os
--     menos usados recentemente.
ALTER TABLE agentes ADD COLUMN extroversao SMALLINT NOT NULL DEFAULT 5
    CHECK (extroversao BETWEEN 0 AND 10);

ALTER TABLE eventos_mundo ADD COLUMN ultimo_uso_tick INT;
