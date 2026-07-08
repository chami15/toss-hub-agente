-- Migration 003 — adiciona identificador_banco a transacoes.
-- Motivo: descobrimos (testando com extrato real) que o CSV do Nubank tem
-- uma coluna `Identificador` (UUID único por transação gerado pelo banco),
-- mais confiável pra dedup do que data+valor+descrição — duas transações
-- reais e distintas podem ter esses três campos idênticos (ex: dois Pix
-- do mesmo valor, mesmo dia, pra mesma pessoa), causando o hash antigo a
-- descartar uma delas por engano.

ALTER TABLE transacoes ADD COLUMN identificador_banco TEXT;
CREATE INDEX idx_transacoes_identificador_banco ON transacoes (banco, identificador_banco);
