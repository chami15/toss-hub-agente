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
  recebe. Vale pra todos os agentes, não é peculiaridade do Financeiro.
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
**sem chat**.

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

### Norte (Projetos)

**Padrão de interação:** um card por vez, por projeto — **sem chat, sem
lista de tarefas tradicional**. Backend implementado e validado com
repositório real; frontend ainda por desenhar.

- Pré-requisito: autorização OAuth do GitHub feita fora do fluxo normal
  (script manual único, mesmo espírito do
  `scripts/autorizar_google_calendar.py` do Agenda) — sem token válido, o
  cadastro de projeto falha rápido com mensagem clara.
- Cadastrar um projeto = colar o link do repositório **+ escolher a
  branch de um dropdown** (não digitar à mão): o frontend chama
  `GET /norte/repositorios/branches?repositorio_url=...` assim que o link
  é colado, mostra as branches reais como opções, e só então o chefe
  confirma — nunca deixa cadastrar apontando pra uma branch que não
  existe (achado testando: nem todo repositório tem o conteúdo real na
  default branch do GitHub). Se o chefe não escolher nenhuma, usa a
  default do repositório automaticamente. Isso só faz o scan inicial
  (descrição/stack/arquitetura) — **não gera nenhum card sozinho**.
- Cada projeto mostra **só um card ativo por vez** (`sugerido` ou
  `aceito`) — nunca uma lista de várias sugestões acumuladas. Abaixo
  dele, um histórico/feed dos cards já resolvidos (`rejeitado` /
  `finalizado`), tipo changelog.
- Botões de decisão no card ativo: **Aceitar** / **Rejeitar** (quando
  `sugerido`), **Marcar como feito** (quando `aceito`).
- Resolver o card ATUAL (aceitar->finalizar ou rejeitar) já devolve o
  PRÓXIMO card na mesma resposta — a UI não precisa de um botão "gerar
  próximo", só troca o card exibido pelo que já veio na resposta.
  Exceção: o primeiríssimo card de um projeto novo precisa de um botão
  explícito "gerar primeira sugestão" (não existe "card anterior" pra
  encadear).
- Card sempre mostra `arquivos_afetados` (paths concretos) — nunca uma
  descrição vaga tipo "melhorar o botão".
- Card pode ter `origem: manual` (você mesmo cria, sem esperar sugestão
  do agente) — mesma regra de "só 1 card não-terminado por projeto" vale
  também pra esse caso.
- Painel de projetos (visão geral): lista de projetos com sinalização de
  "estagnado" (calculado por tempo desde o último card resolvido/commit,
  não um status fixo) — é aqui que mora o "ficar de olho" que motivou o
  agente.

---

## Módulo de interação (motor de tick — Etapas 1, 2 e 3 prontas)

Backend do relógio simulado (Etapa 1), da camada social entre agentes
(Etapa 2) e da proatividade de trabalho (Etapa 3, só o Norte por
enquanto) já existem e estão testados. O que já dá pra prever sobre o
frontend, pra não ficar refazendo depois:

**Relógio simulado**
- Disparo é sempre manual (`POST /tick/avancar`), nunca automático
  nesta fase — precisa de um controle explícito na UI (botão "avançar
  tempo"), não um timer rodando sozinho.
- Suporte a `dry_run`: a UI deveria deixar claro quando está só
  "conferindo" (calcula e mostra o que aconteceria) vs. de fato
  avançando e gravando.
- Exibir o tick atual e a hora simulada em algum lugar sempre visível
  do escritório (`GET /tick/atual`), já que tudo (mensagens, estado dos
  agentes) é referenciado por número de tick.
- Exibir orçamento diário gasto/disponível (`GET /tick/orcamento`) —
  visível pro chefe, ao contrário do custo por ação individual (que
  nunca aparece, ver RNF02).
- Backlog: automação completa do relógio (rodar sozinho em intervalo)
  fica pra depois, com visão de um botão + contador regressivo na UI
  em vez do disparo manual atual.

**Mensagens entre agentes (mural/social e trabalho)**
- Toda mensagem trocada fica em `mensagens`, sempre associada a um
  tick, gerada por `POST /interacao/tick/processar` (renomeado de
  `/interacao/social/processar` — agora cobre trabalho e social juntos,
  disparo manual sempre depois de `POST /tick/avancar`).
- **`tipo='social'`**: entre colaboradores, ou colaborador→chefe
  (imersão, "bom dia" ocasional) — pode tocar em trabalho de forma
  informal, mas nunca é um relatório.
- **`tipo='trabalho'`**: hoje só o Norte gera, sempre direcionado ao
  chefe — aviso de proatividade (ex: "Projeto X parado há N dias, gerei
  um novo card"). Mensagem de **mural** (`destinatario_id NULL`) ainda
  não é gerada por nenhuma etapa — schema já suporta, UI não precisa
  disso ainda.
- Diferenciar visualmente `trabalho` (fundo mais “oficial”, talvez com
  destaque/badge — é a atualização que o chefe realmente quer ver) de
  `social` (tom mais leve, copa) — mesma tabela, propósitos bem
  diferentes.
- Estado do agente (`idle`/`pensando`/`falando`/`executando`, já
  existente em `agentes.estado`) reflete visualmente no avatar/mesa do
  escritório 2D — `'falando'` numa mensagem social, `'executando'` numa
  proatividade de trabalho; volta a `'idle'` no próximo
  `POST /tick/avancar`.
- `POST /interacao/tick/processar?dry_run=true` mostra, sem gastar nem
  executar nada, quem trabalharia/falaria e com quem/sobre o quê nesse
  tick — útil como preview antes de confirmar de verdade.

**Balãozinho de resposta (thread social)**
- `mensagens.respondendo_a_id` (auto-referência a outra `mensagens.id`,
  nullable) marca quando uma mensagem social é resposta direta a outra
  — mesma ideia de "responder" do WhatsApp/Instagram DM.
- Não precisa de campo duplicado nenhum pro conteúdo/remetente da
  mensagem original — um JOIN da própria tabela `mensagens` nela mesma
  já traz tudo pronto pra UI montar o balão (citação em cima, resposta
  embaixo):
  ```sql
  SELECT m.id, m.conteudo, m.criado_em, m.remetente_id, r.nome AS remetente_nome,
         m.respondendo_a_id,
         original.conteudo AS respondendo_a_conteudo,
         original_remetente.nome AS respondendo_a_remetente_nome
  FROM mensagens m
  JOIN agentes r ON r.id = m.remetente_id
  LEFT JOIN mensagens original ON original.id = m.respondendo_a_id
  LEFT JOIN agentes original_remetente ON original_remetente.id = original.remetente_id
  ```
- Quando `respondendo_a_id` for `NULL`, a mensagem é uma fala nova (sem
  balão de citação) — a UI só desenha o balão quando o campo vier
  preenchido.
- Mecânica por trás (não afeta a UI diretamente, só o que aparece):
  quando um agente decide falar e tem uma mensagem social recebida
  ainda sem resposta, ele responde a mais antiga primeiro — nunca
  sorteio nesse caso, é prioridade garantida sobre a roleta normal.

**Caixa de entrada do chefe (estilo WhatsApp/e-mail)**
- `GET /mensagens/caixa-de-entrada` — só o que foi direcionado ao
  chefe (de qualquer agente), já com o mesmo formato de balão acima
  (`respondendo_a_id` + citação via JOIN). É a visão "minha caixa de
  mensagens" — uma tela separada do mural geral (`GET /mensagens`),
  focada só no que É pra ele.
- `POST /mensagens/{id}/responder` — o chefe escreve a própria resposta
  (texto literal, sem LLM) a uma mensagem que recebeu. Vira uma
  mensagem normal, com o mesmo balão de citação apontando pra
  original. Só funciona pra mensagem que foi de fato direcionada a ele
  e que seja `tipo='social'` — avisos de trabalho (ex: card do Norte)
  não se respondem por aqui, têm o próprio fluxo (aceitar/rejeitar/
  finalizar).
- Pensar a UI como uma lista de conversas por agente (uma "thread" por
  colega, não um feed único misturado) — mais perto de DM/e-mail do
  que de mural: clica no agente, vê o histórico com ele, responde ali.
- Ainda não decidido: se essa tela também deveria notificar (badge de
  "não lida") — hoje o campo `lida_pelo_chefe` já existe em
  `mensagens` mas não é usado por nenhum endpoint ainda.

**`eventos_mundo` (gancho de conversa social)**
- Pool curado manualmente (clima, futebol, fim de semana, etc.), já
  seedado (10 eventos iniciais) e sorteado de verdade a cada rodada
  social (`GET /interacao/eventos-mundo` lista, `POST` adiciona) — sem
  geração automática por LLM. A UI precisa de uma forma simples de
  **adicionar um evento novo** (form curto: descrição, pronto — não
  precisa de mais campos).
- Não precisa de tela de gestão elaborada (editar/remover) na primeira
  versão — só adicionar/listar é suficiente pra começar.

**Afinidade e relacionamento entre agentes**
- `relacionamentos.afinidade` (-100 a 100) entre cada par — cresce por
  interação social com retorno decrescente (Etapa 2), todos começam
  neutros (0), sem mecanismo de queda ainda. Ainda não decidido se isso
  aparece na UI (ex: indicador de "proximidade" entre avatares) ou fica
  só interno, moldando quem fala com quem sem nunca ficar visível. Ver
  "Decisões em aberto" abaixo.

---

## Escritório 2D (visão geral, ainda não desenhado)

Ainda não há protótipo nenhum de tela. O que já está decidido/disponível
pra quando começar:
- Um avatar/cartão por agente (cor + emoji já vêm do banco).
- Clicar no avatar abre o painel daquele agente — mas o CONTEÚDO do
  painel é diferente por agente (dashboard pro Financeiro, chat pro
  Agenda, menu de forms pro Saúde, quadro de card único por projeto pro
  Norte) — não existe um "painel genérico" único que sirva pros quatro.
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

**Módulo de interação (motor de tick)**
- RF20: Avançar o relógio simulado manualmente (`POST /tick/avancar`),
  com opção de `dry_run` pra conferir sem gravar.
- RF21: Exibir o tick atual, a hora simulada e o orçamento diário
  gasto/disponível sempre visíveis no escritório.
- RF22: Exibir o mural de mensagens (sem destinatário) e as mensagens
  direcionadas entre pares de agentes, diferenciando visualmente tipo
  trabalho de tipo social.
- RF23: Adicionar um novo `eventos_mundo` por um form simples
  (descrição), sem geração automática por LLM.
- RF24: Processar a rodada completa do tick (`POST
  /interacao/tick/processar`, com `dry_run`) — trabalho tem prioridade
  sobre social; destacar visualmente quando um agente gerou um aviso
  de trabalho de verdade (hoje só o Norte).
- RF25: Exibir a caixa de entrada do chefe (`GET
  /mensagens/caixa-de-entrada`) e responder uma mensagem social
  recebida (`POST /mensagens/{id}/responder`) — estilo WhatsApp/e-mail,
  uma thread por agente.

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
- **RNF09 (tick sempre manual):** nenhuma automação de relógio nesta
  fase — todo avanço de tick é uma ação deliberada do chefe, mesma
  disciplina do RNF01 aplicada ao próprio motor de interação.

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
- **Visão geral de projetos do Norte:** lista simples de cartões, ou algo
  mais visual tipo um quadro/kanban por projeto? Ainda não desenhado.
- **Como sinalizar "estagnado" visualmente:** cor diferente no card do
  projeto, badge, ordenação por tempo parado no topo da lista? A regra
  (tempo desde o último card resolvido) já existe, falta o tratamento
  visual.
- **Afinidade entre agentes aparece na UI ou fica só interna?** Ainda
  não decidido se o "escritório vivo" mostra de alguma forma visual
  (proximidade dos avatares, indicador de relação) o quanto dois
  agentes se dão bem, ou se isso só molda comportamento (quem fala com
  quem) sem nunca virar informação exposta ao chefe.
- **Como visualizar o mural de mensagens:** feed único tipo timeline,
  separado por tick, ou algo mais espacial (balão de fala saindo do
  avatar no escritório 2D)? Ainda não desenhado — depende de como o
  motor de tick (Etapa 2) for implementado de verdade.
