# Frontend — decisões de design por agente (documento vivo)

Nenhum frontend foi construído ainda — o hub inteiro até aqui é backend
(Financeiro, Agenda, Saúde). Mas cada agente, durante a conversa de design
*antes* de codar, já gerou decisões reais de UI/UX (chat vs. form, o que
aparece na tela, o que fica escondido) que valem a pena registrar agora,
enquanto estão frescas — senão se perdem até o frontend começar de
verdade. Este arquivo é atualizado a cada nova decisão desse tipo, não só
quando o frontend for implementado.

Diretriz geral já validada em `avaliacao-mvp.md`: **2D primeiro, 3D depois**
— uma UI 2D simples (cartões/painéis por agente) já prova a experiência
inteira; o "escritório 3D" é upgrade de fantasia, não pré-requisito.

---

## Princípios transversais (valem pra qualquer agente novo)

- **Chat livre não é o padrão — é a exceção.** Cada agente usa a
  interação mais barata/determinística que o domínio permitir. Chat só
  onde existe negociação/raciocínio real (Agenda). Registro estruturado
  vira botão + form (Saúde). Ação em lote vira upload (Financeiro).
- **Nenhum metadado de custo aparece pro chefe** (decisão original do
  Financeiro, ver `resolvers/financeiro.py:obter_relatorio`): modelo,
  tokens, custo_usd ficam só no banco, nunca na resposta que o frontend
  recebe. Vale pros três agentes, não é peculiaridade do Financeiro.
- **Ação que mexe em sistema externo sempre tem confirmação explícita
  antes de executar** (Agenda/Google Calendar) — isso precisa aparecer na
  UI como um estado visualmente diferente de uma mensagem comum (ver
  "decisões em aberto" abaixo), não só texto corrido perguntando "confirma?".
- **Ação que só mexe no próprio banco não precisa de confirmação** (Saúde)
  — pode salvar e já mostrar feedback imediato, sem fricção de "tem
  certeza?" pra cada registro do dia a dia.
- **Cor e emoji por agente já existem no banco** (`agentes.avatar_config`,
  populado em `scripts/seed.py`) — é só o frontend consumir, não precisa
  redecidir isso na hora de construir a tela.
- **Estado visual do agente já existe no schema** (`agentes.estado`:
  idle/pensando/falando/executando, ver `db/migrations/001_init.sql`) —
  ainda não é setado por nenhum resolver hoje (fica pro motor de tick
  atualizar), mas o campo já está pronto pro frontend ler.

---

## Por agente

### Financeiro (Cifra)

**Padrão de interação:** painel/dashboard, **sem chat**.

- Upload de extrato: seletor de arquivo + escolha de banco (Itaú/Nubank).
  Sem preview antes de importar — o retorno já vem com
  total/novas/duplicadas.
- Dashboard: KPIs + gráficos calculados ao vivo (`GET /financeiro/dashboard`),
  sempre por mês (`YYYY-MM`) — precisa de um seletor de mês na tela.
- Relatório mensal: ação deliberada e separada do dashboard (botão
  "Gerar relatório", nunca automático) — mostra a narrativa (padrões,
  recomendações, resumo) depois de gerado; se ainda não existe pro mês,
  a tela deveria oferecer o botão de gerar, não só um erro genérico.
- Metadados de custo (decisão explícita, ver princípios acima): não
  aparecem em lugar nenhum da tela.

### Agenda

**Padrão de interação:** chat conversacional (mas o backend roteia por
palavra-chave — não é um LLM em chat livre de verdade).

- Uma caixa de mensagem de texto simples (`POST /agenda/mensagem`).
- Resposta do agente pode ser: informativa, pergunta, ou proposta
  aguardando confirmação (`aguardando_confirmacao: true` no retorno) —
  a UI precisa diferenciar visualmente uma proposta pendente de uma
  mensagem comum (ver decisão em aberto abaixo sobre botões).
- Confirmar/rejeitar tem endpoint próprio
  (`POST /agenda/acoes/{id}/confirmar|rejeitar`) — não precisa
  necessariamente depender do usuário digitar "sim"/"não" de novo.
- Existe uma consulta determinística de "qual pendência está em aberto"
  (frase-gatilho no texto) — o frontend poderia (ver decisão em aberto)
  chamar isso proativamente pra mostrar um indicador, em vez de depender
  do chefe lembrar de perguntar.

### Saúde (Vita)

**Padrão de interação:** menu de ações + forms determinísticos,
**sem chat** — o mais estruturado dos três.

- Onboarding: se `GET /saude/perfil` voltar 404, mostrar a "entrevista"
  inicial (form: nome, sexo, data de nascimento, altura, objetivo,
  diabetes, restrições) antes de liberar o resto do menu.
- Menu principal (um botão por ação, cada um abre um form diferente):
  Registrar refeição · Registrar atividade · Registrar sono · Registrar
  hidratação · Ficha de treino · Plano de dieta · Relatório semanal ·
  Editar perfil.
- Registrar refeição tem DOIS caminhos visíveis (não um só): "mandar
  foto" ou "descrever por texto" — cada um chama um endpoint diferente
  (`/saude/refeicao/foto` vs `/saude/refeicao/texto`).
- Registrar atividade: form em etapas — primeiro tipo (corrida/academia/
  esporte/caminhada/outro), depois duração.
- **Peso e hidratação são atalho rápido direto na bolha do agente**
  (decisão explícita, ver conversa de design) — não passam pelo menu
  lateral inteiro, só um campo único. Peso **nunca** vem pré-preenchido
  com o último valor (decisão explícita — peso oscila de um jeito que
  pré-preencher seria contraprodutivo).
- Ficha de treino: form de múltiplos exercícios por dia da semana — a UI
  precisa deixar claro que dá pra adicionar mais de um exercício por dia
  (isso já confundiu no teste manual da API).
- Plano de dieta e relatório semanal são ações deliberadas (botão
  "Gerar"), igual o relatório do Financeiro — nunca automáticas.

---

## Escritório 2D (visão geral, ainda não desenhado)

Ainda não há protótipo nenhum de tela. O que já está decidido/disponível
pra quando começar:
- Um avatar/cartão por agente (cor + emoji já vêm do banco).
- Clicar no avatar abre o painel daquele agente — mas o CONTEÚDO do
  painel é diferente por agente (dashboard pro Financeiro, chat pro
  Agenda, menu de forms pro Saúde) — não existe um "painel genérico"
  único que sirva pros três.
- Atalhos que vivem na própria bolha do avatar, sem abrir o painel
  inteiro (hoje só peso/hidratação do Saúde, mas o padrão pode se repetir
  pra outros agentes futuros com ações de campo único e alta frequência).

---

## Requisitos funcionais

Derivados do que já existe no backend de cada agente — não são desejo,
são o que a API já suporta e o frontend precisa cobrir.

**Gerais / Escritório**
- RF01: Listar os agentes ativos (`GET /agentes`), exibindo nome, cor e
  emoji do `avatar_config`.
- RF02: Clicar no avatar de um agente abre o painel daquele domínio —
  o tipo de painel (dashboard, chat, menu de forms) depende do agente.
- RF03: Expor na própria bolha do avatar os atalhos de campo único,
  quando existirem (hoje: peso e hidratação do Saúde).

**Financeiro (Cifra)**
- RF04: Upload de extrato (Itaú PDF ou Nubank CSV), escolhendo o banco
  antes do envio.
- RF05: Exibir o resultado do upload (total no arquivo, novas,
  duplicadas, período coberto).
- RF06: Exibir o dashboard mensal (KPIs + gráficos) com seletor de mês.
- RF07: Gerar o relatório mensal sob demanda, como ação separada e
  deliberada do dashboard.
- RF08: Exibir o relatório já gerado (padrões, recomendações, resumo)
  quando existir; indicar claramente quando ainda não foi gerado pro mês
  selecionado.

**Agenda**
- RF09: Enviar mensagens de texto livre pro agente.
- RF10: Diferenciar visualmente uma proposta aguardando confirmação de
  uma mensagem informativa comum.
- RF11: Confirmar ou rejeitar uma proposta pendente.
- RF12: Consultar o que está pendente no momento, sem depender do chefe
  lembrar de perguntar em texto.

**Saúde (Vita)**
- RF13: Exibir a entrevista inicial (form de perfil) quando o perfil
  ainda não existir; bloquear o resto do menu até ela ser preenchida.
- RF14: Exibir o menu de ações (refeição, atividade, sono, hidratação,
  ficha de treino, plano de dieta, relatório, editar perfil).
- RF15: Registrar refeição por dois caminhos distintos — foto ou
  descrição em texto.
- RF16: Registrar atividade em duas etapas (tipo, depois duração).
- RF17: Editar a ficha de treino com múltiplos exercícios por dia da
  semana.
- RF18: Gerar plano de dieta e relatório semanal sob demanda; indicar
  quando o relatório da semana já foi gerado (bloqueado até a próxima).
- RF19: Atalho de campo único pra peso e hidratação, sem abrir o menu
  completo.

## Requisitos não funcionais

- **RNF01 (controle de custo):** nenhuma ação que dispare uma chamada de
  LLM acontece automaticamente — sempre uma ação deliberada do chefe
  (botão "gerar", envio de mensagem), nunca disparada por upload, tela
  abrindo ou timer.
- **RNF02 (transparência):** nenhum metadado de custo (modelo, tokens,
  custo_usd) aparece na interface — mas o estado de cada ação (pendente,
  confirmada, rejeitada, expirada) é sempre visível e claro.
- **RNF03 (confiabilidade de erro):** erros da API (422, 404, 409, etc.)
  aparecem como mensagem clara e acionável, nunca como erro genérico ou
  tela quebrada.
- **RNF04 (auditabilidade):** ação real em sistema externo (Agenda) exige
  confirmação explícita antes de executar; ação que só grava no próprio
  banco (Saúde) pode ser imediata, sem fricção.
- **RNF05 (consistência visual):** apesar de cada agente ter um padrão de
  interação diferente (chat, dashboard, forms), identidade visual (cor,
  avatar, tipografia) é consistente entre os painéis.
- **RNF06 (privacidade):** dado financeiro e de saúde é sensível — sem
  telemetria/analytics de terceiros nessas telas; dado nunca sai do
  ambiente do próprio chefe.
- **RNF07 (performance percebida):** consultas diretas sem LLM (dashboard,
  histórico) respondem de forma imediata; ações com LLM (relatório,
  plano, estimativa de refeição) indicam visualmente que estão
  processando, já que podem levar alguns segundos.
- **RNF08 (2D primeiro):** interface inicial é 2D (cartões/painéis), sem
  biblioteca gráfica pesada — 3D é evolução posterior, não bloqueia o
  resto (ver `avaliacao-mvp.md`).

---

## Decisões em aberto (resolver quando o frontend começar de verdade)

- **Confirmar/rejeitar do Agenda via botão ou só texto?** O backend aceita
  os dois (regex cobre "sim/confirma/pode" e "não/cancela", e existe
  endpoint dedicado por id). Botões evitam ambiguidade de digitação, mas
  não foi decidido se a UI vai ter os dois caminhos ou só um.
- **Indicador de pendência em aberto:** vale a UI perguntar
  proativamente "qual pendência em aberto" ao carregar a tela do Agenda
  (pra mostrar um badge), em vez de esperar o chefe lembrar de perguntar?
- **Layout do menu do Saúde:** lateral fixo, modal, ou dentro do próprio
  painel do avatar? Ainda não desenhado.
- **Onde os atalhos de campo único aparecem:** só na bolha do avatar no
  escritório, ou também dentro do painel do agente quando já aberto?
