-- Migration 009 — thread de resposta social (refinamento da Etapa 2,
-- achado na validação manual do chefe: agentes trocavam mensagem mas
-- nunca se respondiam de verdade, cada um só puxava assunto novo).
--
-- Um campo só, auto-referência — nenhum dado duplicado de remetente ou
-- conteúdo da mensagem original: isso é derivável via JOIN na própria
-- tabela `mensagens` quando for montar o "balãozinho" de resposta (ver
-- docs/frontend-design.md).
ALTER TABLE mensagens ADD COLUMN respondendo_a_id INT REFERENCES mensagens(id);
