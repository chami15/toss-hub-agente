--QUERY: desativar_todos
UPDATE planos_dieta SET ativo = FALSE WHERE ativo;

--QUERY: inserir
INSERT INTO planos_dieta
    (meta_calorica, carboidratos_g, proteinas_g, gorduras_g, orientacoes,
     modelo, tokens_in, tokens_out, custo_usd)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
RETURNING id, meta_calorica, carboidratos_g, proteinas_g, gorduras_g, orientacoes, gerado_em;

--QUERY: buscar_ativo
SELECT id, meta_calorica, carboidratos_g, proteinas_g, gorduras_g, orientacoes, gerado_em
FROM planos_dieta
WHERE ativo
ORDER BY gerado_em DESC
LIMIT 1;
