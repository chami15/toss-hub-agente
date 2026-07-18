--QUERY: listar_todas
SELECT m.id, m.tipo, m.conteudo, m.tick, m.criado_em,
       m.remetente_id, r.nome AS remetente_nome,
       m.destinatario_id, d.nome AS destinatario_nome
FROM mensagens m
JOIN agentes r ON r.id = m.remetente_id
LEFT JOIN agentes d ON d.id = m.destinatario_id
ORDER BY m.id DESC
LIMIT %s;

--QUERY: inserir
INSERT INTO mensagens (remetente_id, destinatario_id, tipo, conteudo, tick)
VALUES (%s, %s, %s, %s, %s)
RETURNING id, remetente_id, destinatario_id, tipo, conteudo, tick, criado_em;

--QUERY: ultimo_tick_social_do_agente
SELECT tick FROM mensagens
WHERE remetente_id = %s AND tipo = 'social' AND tick IS NOT NULL
ORDER BY tick DESC
LIMIT 1;

--QUERY: ultimas_do_par
SELECT conteudo, tick, criado_em, remetente_id, destinatario_id
FROM mensagens
WHERE tipo = 'social'
  AND ((remetente_id = %s AND destinatario_id = %s) OR (remetente_id = %s AND destinatario_id = %s))
ORDER BY criado_em DESC
LIMIT %s;

--QUERY: contar_sociais_do_par_hoje
SELECT COUNT(*) AS total FROM mensagens
WHERE tipo = 'social'
  AND ((remetente_id = %s AND destinatario_id = %s) OR (remetente_id = %s AND destinatario_id = %s))
  AND criado_em >= %s;

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
