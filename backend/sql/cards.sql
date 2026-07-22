--QUERY: inserir
INSERT INTO cards
    (projeto_id, tipo, titulo, descricao, arquivos_afetados, origem, status, modelo, tokens_in, tokens_out, custo_usd)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
RETURNING id, projeto_id, tipo, titulo, descricao, arquivos_afetados, origem, status, criado_em;

--QUERY: buscar_por_id
SELECT id, projeto_id, tipo, titulo, descricao, arquivos_afetados, origem, status,
       modelo, tokens_in, tokens_out, custo_usd, criado_em, resolvido_em
FROM cards
WHERE id = %s;

--QUERY: buscar_ativo_por_projeto
SELECT id, projeto_id, tipo, titulo, descricao, arquivos_afetados, origem, status, criado_em
FROM cards
WHERE projeto_id = %s AND status IN ('sugerido', 'aceito')
LIMIT 1;

--QUERY: historico_por_projeto
SELECT id, projeto_id, tipo, titulo, descricao, arquivos_afetados, origem, status, criado_em, resolvido_em
FROM cards
WHERE projeto_id = %s AND status IN ('rejeitado', 'finalizado')
ORDER BY resolvido_em DESC
LIMIT %s;

--QUERY: marcar_aceito
UPDATE cards SET status = 'aceito' WHERE id = %s;

--QUERY: marcar_rejeitado
UPDATE cards SET status = 'rejeitado', resolvido_em = now() WHERE id = %s;

--QUERY: marcar_finalizado
UPDATE cards SET status = 'finalizado', resolvido_em = now() WHERE id = %s;
