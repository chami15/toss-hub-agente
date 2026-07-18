--QUERY: upsert_neutro
INSERT INTO relacionamentos (agente_id, alvo_agente_id)
VALUES (%s, %s)
ON CONFLICT (agente_id, alvo_agente_id) DO NOTHING;

--QUERY: buscar_por_par
SELECT agente_id, alvo_agente_id, afinidade, opiniao
FROM relacionamentos
WHERE agente_id = %s AND alvo_agente_id = %s;

--QUERY: listar_afinidades_de
SELECT alvo_agente_id, afinidade
FROM relacionamentos
WHERE agente_id = %s;

--QUERY: atualizar_afinidade
UPDATE relacionamentos SET afinidade = %s, atualizado_em = now()
WHERE agente_id = %s AND alvo_agente_id = %s
RETURNING agente_id, alvo_agente_id, afinidade;
