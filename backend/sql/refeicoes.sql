--QUERY: inserir
INSERT INTO refeicoes
    (tipo_refeicao, origem, descricao, imagem_path, calorias, carboidratos_g,
     proteinas_g, gorduras_g, confianca_estimativa, modelo, tokens_in, tokens_out, custo_usd)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
RETURNING id, tipo_refeicao, origem, descricao, calorias, carboidratos_g,
          proteinas_g, gorduras_g, confianca_estimativa, registrado_em;

--QUERY: historico
SELECT id, tipo_refeicao, origem, descricao, calorias, carboidratos_g,
       proteinas_g, gorduras_g, confianca_estimativa, registrado_em
FROM refeicoes
WHERE registrado_em >= %s
ORDER BY registrado_em ASC;

--QUERY: total_periodo
SELECT
    COALESCE(SUM(calorias), 0)       AS calorias,
    COALESCE(SUM(carboidratos_g), 0) AS carboidratos_g,
    COALESCE(SUM(proteinas_g), 0)    AS proteinas_g,
    COALESCE(SUM(gorduras_g), 0)     AS gorduras_g
FROM refeicoes
WHERE registrado_em >= %s;
