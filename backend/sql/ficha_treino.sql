--QUERY: listar_dias_ativos
SELECT id, dia_semana, grupo_muscular, criado_em
FROM ficha_treino_dias
WHERE ativo
ORDER BY array_position(
    ARRAY['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'], dia_semana
);

--QUERY: listar_exercicios_por_dia
SELECT id, dia_ficha_id, nome_exercicio, series, repeticoes, ordem
FROM ficha_treino_exercicios
WHERE dia_ficha_id = %s
ORDER BY ordem;

--QUERY: desativar_dia
UPDATE ficha_treino_dias SET ativo = FALSE WHERE dia_semana = %s AND ativo;

--QUERY: inserir_dia
INSERT INTO ficha_treino_dias (dia_semana, grupo_muscular)
VALUES (%s, %s)
RETURNING id, dia_semana, grupo_muscular, criado_em;

--QUERY: inserir_exercicio
INSERT INTO ficha_treino_exercicios (dia_ficha_id, nome_exercicio, series, repeticoes, ordem)
VALUES (%s, %s, %s, %s, %s)
RETURNING id, nome_exercicio, series, repeticoes, ordem;
