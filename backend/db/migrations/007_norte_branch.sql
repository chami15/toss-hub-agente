-- Migration 007 — branch explícita por projeto (agente Norte).
-- Achado testando de verdade: nem todo repositório tem o conteúdo real
-- na default branch do GitHub (às vezes está numa branch de
-- desenvolvimento separada). `projetos.branch` guarda o valor concreto
-- resolvido UMA VEZ no cadastro (escolhido pelo chefe, ou a default
-- branch de verdade se ele não escolher) — nunca é re-resolvido depois,
-- pra nunca "trocar de branch" sozinho se a default do repositório
-- mudar depois do cadastro (mesmo espírito do `ultimo_commit_sha`: um
-- ponteiro concreto, não uma resolução dinâmica repetida).
ALTER TABLE projetos ADD COLUMN branch TEXT NOT NULL DEFAULT 'main';
ALTER TABLE projetos ALTER COLUMN branch DROP DEFAULT;
