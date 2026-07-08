--QUERY: listar_todas
SELECT m.id, m.tipo, m.conteudo, m.tick, m.criado_em,
       m.remetente_id, r.nome AS remetente_nome,
       m.destinatario_id, d.nome AS destinatario_nome
FROM mensagens m
JOIN agentes r ON r.id = m.remetente_id
LEFT JOIN agentes d ON d.id = m.destinatario_id
ORDER BY m.id DESC
LIMIT %s;

--QUERY: listar_por_tipo
SELECT m.id, m.tipo, m.conteudo, m.tick, m.criado_em,
       m.remetente_id, r.nome AS remetente_nome,
       m.destinatario_id, d.nome AS destinatario_nome
FROM mensagens m
JOIN agentes r ON r.id = m.remetente_id
LEFT JOIN agentes d ON d.id = m.destinatario_id
WHERE m.tipo = %s
ORDER BY m.id DESC
LIMIT %s;
