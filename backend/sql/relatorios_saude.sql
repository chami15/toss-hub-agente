--QUERY: buscar_por_semana
SELECT id, semana_inicio, relatorio, gerado_em
FROM relatorios_saude
WHERE semana_inicio = %s;

--QUERY: inserir
INSERT INTO relatorios_saude
    (semana_inicio, relatorio, modelo, tokens_in, tokens_out, custo_usd)
VALUES (%s, %s::jsonb, %s, %s, %s, %s)
RETURNING id, semana_inicio, relatorio, gerado_em;
