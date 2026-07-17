--QUERY: buscar_ultimo
SELECT id, numero, hora_simulada, estado_mundo, processado_em
FROM ticks
ORDER BY numero DESC
LIMIT 1;

--QUERY: inserir
INSERT INTO ticks (numero, hora_simulada, estado_mundo)
VALUES (%s, %s, %s::jsonb)
RETURNING id, numero, hora_simulada, estado_mundo, processado_em;

--QUERY: custo_gasto_hoje
-- Soma custo_usd de HOJE em toda tabela de domínio que já rastreia custo
-- de LLM — usado pro guardrail de orçamento diário do motor de tick,
-- antes de qualquer chamada de LLM disparada por um tick (etapas
-- futuras — essa etapa ainda não gasta nada, só audita).
SELECT COALESCE(SUM(custo_usd), 0) AS total FROM (
    SELECT custo_usd FROM relatorios_financeiros WHERE gerado_em >= %s
    UNION ALL
    SELECT custo_usd FROM refeicoes WHERE registrado_em >= %s
    UNION ALL
    SELECT custo_usd FROM planos_dieta WHERE gerado_em >= %s
    UNION ALL
    SELECT custo_usd FROM relatorios_saude WHERE gerado_em >= %s
    UNION ALL
    SELECT custo_usd FROM cards WHERE criado_em >= %s
) custos;
