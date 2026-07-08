--QUERY: upsert_neutro
INSERT INTO relacionamentos (agente_id, alvo_agente_id)
VALUES (%s, %s)
ON CONFLICT (agente_id, alvo_agente_id) DO NOTHING;
