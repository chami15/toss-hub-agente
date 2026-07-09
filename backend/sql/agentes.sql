--QUERY: listar
SELECT id, nome, tipo, especialidade, estado, mesa, avatar_config, ativo
FROM agentes
ORDER BY mesa NULLS LAST, id;

--QUERY: buscar_por_id
SELECT id, nome, tipo, especialidade, personalidade, avatar_config, estado, mesa, ativo
FROM agentes
WHERE id = %s;

--QUERY: buscar_por_especialidade
SELECT id, nome, tipo, especialidade, personalidade, avatar_config, estado, mesa, ativo
FROM agentes
WHERE especialidade = %s
LIMIT 1;

--QUERY: upsert
INSERT INTO agentes (nome, tipo, especialidade, personalidade, avatar_config, mesa)
VALUES (%s, %s, %s, %s, %s::jsonb, %s)
ON CONFLICT (nome) DO UPDATE SET
    especialidade = EXCLUDED.especialidade,
    personalidade = EXCLUDED.personalidade,
    avatar_config = EXCLUDED.avatar_config,
    mesa          = EXCLUDED.mesa
RETURNING id, nome;
