--QUERY: inserir
INSERT INTO eventos_mundo (descricao, tick)
VALUES (%s, %s)
RETURNING id, descricao, tick, criado_em;

--QUERY: listar
SELECT id, descricao, tick, ultimo_uso_tick, criado_em
FROM eventos_mundo
ORDER BY id;

--QUERY: contar
SELECT COUNT(*) AS total FROM eventos_mundo;

--QUERY: sortear_menos_usado
-- Prioriza os nunca usados (ultimo_uso_tick NULL), depois os usados há
-- mais tempo; sorteia aleatoriamente entre os empatados.
SELECT id, descricao FROM eventos_mundo
ORDER BY ultimo_uso_tick ASC NULLS FIRST, random()
LIMIT 1;

--QUERY: marcar_usado
UPDATE eventos_mundo SET ultimo_uso_tick = %s WHERE id = %s;
