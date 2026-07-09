--QUERY: inserir
INSERT INTO acoes_pendentes (agente_id, tipo, descricao, payload)
VALUES (%s, %s, %s, %s::jsonb)
RETURNING id, agente_id, tipo, descricao, payload, status, criado_em;

--QUERY: buscar_pendente_por_agente
SELECT id, agente_id, tipo, descricao, payload, status, criado_em
FROM acoes_pendentes
WHERE agente_id = %s AND status = 'pendente'
ORDER BY criado_em DESC
LIMIT 1;

--QUERY: buscar_por_id
SELECT id, agente_id, tipo, descricao, payload, status, resultado, erro, criado_em, resolvido_em
FROM acoes_pendentes
WHERE id = %s;

--QUERY: marcar_rejeitada
UPDATE acoes_pendentes
SET status = 'rejeitado', resolvido_em = now()
WHERE id = %s;

--QUERY: marcar_confirmada_sucesso
UPDATE acoes_pendentes
SET status = 'confirmado', resultado = %s::jsonb, resolvido_em = now()
WHERE id = %s;

--QUERY: marcar_confirmada_erro
UPDATE acoes_pendentes
SET status = 'confirmado', erro = %s, resolvido_em = now()
WHERE id = %s;
