--QUERY: inserir
INSERT INTO extratos_importados (banco, nome_arquivo, periodo_inicio, periodo_fim, total_transacoes)
VALUES (%s, %s, %s, %s, %s)
RETURNING id;
