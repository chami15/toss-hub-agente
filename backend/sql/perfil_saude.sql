--QUERY: buscar
SELECT id, nome, sexo, data_nascimento, altura_cm, objetivo, tem_diabetes,
       restricoes_alimentares, criado_em, atualizado_em
FROM perfil_saude
LIMIT 1;

--QUERY: upsert
INSERT INTO perfil_saude
    (nome, sexo, data_nascimento, altura_cm, objetivo, tem_diabetes, restricoes_alimentares)
VALUES (%s, %s, %s, %s, %s, %s, %s)
ON CONFLICT ((TRUE)) DO UPDATE SET
    nome                   = EXCLUDED.nome,
    sexo                   = EXCLUDED.sexo,
    data_nascimento        = EXCLUDED.data_nascimento,
    altura_cm              = EXCLUDED.altura_cm,
    objetivo               = EXCLUDED.objetivo,
    tem_diabetes           = EXCLUDED.tem_diabetes,
    restricoes_alimentares = EXCLUDED.restricoes_alimentares,
    atualizado_em          = now()
RETURNING id, nome, sexo, data_nascimento, altura_cm, objetivo, tem_diabetes,
          restricoes_alimentares, criado_em, atualizado_em;
