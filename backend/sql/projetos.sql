--QUERY: inserir
INSERT INTO projetos
    (nome, repositorio_url, repositorio_owner, repositorio_nome, descricao, stack, arquitetura_resumo, ultimo_commit_sha)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
RETURNING id, nome, repositorio_url, repositorio_owner, repositorio_nome, descricao, stack,
          arquitetura_resumo, ultimo_commit_sha, status, criado_em, atualizado_em;

--QUERY: listar
SELECT id, nome, repositorio_url, repositorio_owner, repositorio_nome, descricao, stack,
       arquitetura_resumo, status, criado_em, atualizado_em
FROM projetos
ORDER BY atualizado_em DESC;

--QUERY: buscar_por_id
SELECT id, nome, repositorio_url, repositorio_owner, repositorio_nome, descricao, stack,
       arquitetura_resumo, ultimo_commit_sha, status, criado_em, atualizado_em
FROM projetos
WHERE id = %s;

--QUERY: atualizar_status
UPDATE projetos
SET status = %s, atualizado_em = now()
WHERE id = %s
RETURNING id, nome, status, atualizado_em;

--QUERY: atualizar_ultimo_commit_sha
UPDATE projetos
SET ultimo_commit_sha = %s, atualizado_em = now()
WHERE id = %s;
