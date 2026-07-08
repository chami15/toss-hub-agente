--QUERY: upsert
INSERT INTO relatorios_financeiros
    (mes_referencia, relatorio, modelo, tokens_in, tokens_out, custo_usd)
VALUES (%s, %s::jsonb, %s, %s, %s, %s)
ON CONFLICT (mes_referencia) DO UPDATE SET
    relatorio  = EXCLUDED.relatorio,
    modelo     = EXCLUDED.modelo,
    tokens_in  = EXCLUDED.tokens_in,
    tokens_out = EXCLUDED.tokens_out,
    custo_usd  = EXCLUDED.custo_usd,
    gerado_em  = now()
RETURNING id, mes_referencia;

--QUERY: buscar_por_mes
SELECT id, mes_referencia, relatorio, modelo, tokens_in, tokens_out, custo_usd, gerado_em
FROM relatorios_financeiros
WHERE mes_referencia = %s;
