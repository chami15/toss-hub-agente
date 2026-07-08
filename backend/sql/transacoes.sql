--QUERY: inserir
INSERT INTO transacoes
    (banco, data, valor, tipo, descricao_bruta, descricao_normalizada, hash_lancamento, extrato_importado_id)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (hash_lancamento) DO NOTHING
RETURNING id;

--QUERY: resumo_mensal
SELECT
    COALESCE(SUM(valor) FILTER (WHERE tipo = 'entrada'), 0) AS total_entradas,
    COALESCE(SUM(valor) FILTER (WHERE tipo = 'saida'), 0) AS total_saidas
FROM transacoes
WHERE data >= %s AND data < (%s::date + INTERVAL '1 month');

--QUERY: por_categoria
SELECT
    COALESCE(categoria, 'Não categorizado') AS categoria,
    SUM(valor) AS valor
FROM transacoes
WHERE tipo = 'saida'
  AND data >= %s AND data < (%s::date + INTERVAL '1 month')
GROUP BY categoria
ORDER BY valor DESC;

--QUERY: evolucao_diaria
SELECT
    EXTRACT(DAY FROM data)::int AS dia,
    SUM(valor) AS valor
FROM transacoes
WHERE tipo = 'saida'
  AND data >= %s AND data < (%s::date + INTERVAL '1 month')
GROUP BY dia
ORDER BY dia;

--QUERY: maiores_gastos
SELECT descricao_normalizada, descricao_bruta, valor, data, categoria
FROM transacoes
WHERE tipo = 'saida'
  AND data >= %s AND data < (%s::date + INTERVAL '1 month')
ORDER BY valor DESC
LIMIT %s;

--QUERY: listar_saidas_historico
SELECT id, data, valor, descricao_bruta, descricao_normalizada, categoria,
       recorrente_tipo, parcela_atual, parcela_total
FROM transacoes
WHERE tipo = 'saida'
  AND data >= %s
ORDER BY data ASC;

--QUERY: atualizar_categoria
UPDATE transacoes SET categoria = %s WHERE id = %s;

--QUERY: atualizar_recorrencia
UPDATE transacoes
SET recorrente_tipo = %s, parcela_atual = %s, parcela_total = %s
WHERE id = %s;
