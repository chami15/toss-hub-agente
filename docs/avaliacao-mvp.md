# Avaliação do MVP — Hub de Agentes ("Escritório Vivo")

> Revisão técnica do documento `mvp-hub-agentes.md`. Foco em: viabilidade, validade da stack, dificuldade real de implementação e como manter **controle** sobre o que os agentes estão fazendo.

---

## TL;DR

- **Viável?** Sim. O conceito é uma combinação de coisas que já foram provadas isoladamente (Generative Agents/Stanford para a parte social, orquestração de agentes para a parte de tarefas). O risco não é "dá pra fazer?", é "dá pra fazer barato e controlável?".
- **A stack está válida?** Quase toda sim. Dois ajustes que recomendo: (1) **adiar o 3D** — é o maior sorvedouro de tempo e o menos essencial pra validar a ideia; (2) **LangGraph é opcional no MVP** — pode até atrapalhar o "controle" que você quer no começo.
- **Dificuldade?** O **núcleo** (banco + 2 agentes + motor de tick + canal de trabalho, tudo em texto) é **fácil/médio** e cabe num fim de semana. O **MVP completo do documento** (3D + social + execução real + integrações) é **médio** e realisticamente leva **2 a 4 fins de semana**, não um.
- **Controle:** o documento já tem bons princípios (saída estruturada, tick limitado, modelo pequeno por padrão). Falta explicitar **observabilidade e contabilidade de custo** como parte do produto, não como "depois". Isso é o que te dá o controle que você pediu.

---

## 1. Viabilidade do conceito

O que você descreveu é essencialmente **"Generative Agents (Park et al., 2023) + execução de tarefas reais + camada visual"**. Vale separar em três blocos, porque o risco de cada um é bem diferente:

| Bloco | O que é | Risco técnico | Risco de custo |
|---|---|---|---|
| **Execução de tarefas** | Agente consulta/lança gasto no Postgres, lê agenda, etc | Baixo | Baixo |
| **Simulação social** (copa, fofoca, relacionamento) | Agentes conversando entre si sem input humano | Baixo-médio | **Alto** (é o que roda sozinho e acumula) |
| **Visualização 3D** | Avatares, estados, cena | Médio (mão de obra) | Baixo |

A conclusão importante: **o que é tecnicamente difícil (3D) é barato de rodar, e o que é tecnicamente fácil (social) é caro de rodar**. Seu maior inimigo não é complexidade de código — é custo de token acumulando enquanto os agentes "vivem". Todo o design de controle tem que mirar nisso.

**Veredito:** conceito sólido e original na combinação. A parte que valida a experiência ("é legal de usar?") é a social + o resumo pra você — e essa parte você consegue provar **sem 3D e sem integrações externas**. Comece por ela.

---

## 2. Avaliação da stack

| Camada | Proposta | Veredito | Observação |
|---|---|---|---|
| Backend/API | FastAPI | ✅ Mantém | Escolha certa, leve, async nativo. |
| Banco | PostgreSQL | ✅ Mantém | Certíssimo. Ver seção 4 pra ajustes de schema. Considere **Supabase** (é Postgres + realtime + auth) — o *realtime* te dá push de mensagem pro frontend de graça, sem você escrever camada de WebSocket. Você tem o MCP do Supabase disponível aqui. |
| Scheduler | APScheduler | ✅ Mantém | Suficiente. Comece rodando o tick **na mão** (CLI) antes de agendar. |
| LLM em 2 níveis | Modelo barato p/ decisão + forte p/ execução | ✅ Mantém | Melhor decisão do documento pra custo. Ver seção 5. |
| Orquestração | LangGraph | ⚠️ Opcional | Ver abaixo. |
| Frontend | React + R3F + Vite | ⚠️ Adiar o 3D | Ver abaixo. |
| Integrações | MCP Calendar + Evolution API | ⚠️ Fase tardia | Cada uma traz auth, rate limit e modo de falha próprio. Não são pré-requisito pra validar a ideia. |
| Containerização | Docker/compose | ✅ Mantém | Bom pra subir Postgres local em segundos. |

### 2.1 LangGraph — opcional no começo, e por quê
LangGraph é ótimo pra fluxos de agente ramificados e com estado. Mas pro seu caso, no MVP, ele:
- **adiciona uma camada de abstração entre você e o que está acontecendo** — exatamente o oposto do "quero controle sobre o que está sendo feito";
- resolve um problema (roteamento de grafo condicional) que o seu tick **ainda não tem** — no MVP o loop é simples: "pra cada agente ativo, monte contexto → chame LLM → parseie JSON → aplique efeitos".

Isso são ~40 linhas de Python que você lê inteiras e debuga com `print`. Recomendo: **comece com esse loop explícito**. Quando o roteamento ficar realmente ramificado (ex: supervisor decide dinamicamente quais agentes acordam, sub-grafos por domínio), aí migra pra LangGraph com o problema já entendido. Se você já domina LangGraph do EVAL e prefere padronizar, tudo bem — só saiba que no MVP ele é conveniência, não necessidade, e cobra um preço em visibilidade.

### 2.2 O 3D é o maior risco de cronograma
React Three Fiber é excelente e a escolha certa **quando** você for fazer 3D. O problema é de **priorização**: 3D é onde mora a maior parte do esforço de UI (modelos, câmera, estados de avatar, iluminação) e é o que **menos** te ajuda a responder a pergunta do MVP ("essa dinâmica é interessante?"). O próprio documento já coloca 3D na Fase 4 — ótimo, mantenha essa disciplina. Para as Fases 1–3, uma **UI 2D boba** (lista de avatares como cartões + painel de chat com as duas abas trabalho/copa) prova a experiência inteira. Trate o 3D como *upgrade de fantasia*, não como parte do núcleo.

---

## 3. Dificuldade real, por componente

Escala: 🟢 fácil · 🟡 médio · 🔴 trabalhoso (não necessariamente difícil, mas consome tempo).

| Componente | Dif. | Comentário |
|---|---|---|
| Schema + migrations | 🟢 | Poucas horas. Ajustes na seção 4. |
| 2 agentes respondendo via API | 🟢 | Prompt de sistema + chamada de LLM + endpoint. |
| Saída estruturada em JSON confiável | 🟢🟡 | Fácil com *structured output*/function calling nativo + validação Pydantic. O "🟡" é a disciplina de tratar falha de parse (retry, fallback pra "ocioso"). |
| Motor de tick (manual, depois agendado) | 🟢🟡 | O loop é simples. O médio é o **empacotamento de contexto** (o que entra no prompt de cada agente sem estourar token). |
| Canal social + score de relacionamento | 🟡 | Prompt engineering + manter contexto de trabalho e social **separados** (sua regra #4). Aqui mora a graça e o custo. |
| Execução real (gasto no Postgres) | 🟢🟡 | Trivial escrever; o cuidado é o gate de confirmação (sua regra #1) **no nível da ferramenta**, não só no prompt. |
| Integrações externas (Calendar/WhatsApp) | 🟡 | Auth + rate limit + modos de falha. Empurre pra depois do núcleo funcionar. |
| Observabilidade + custo (ver seção 6) | 🟡 | Não está no documento e **deveria estar no núcleo**. É o que te dá controle. |
| Frontend 2D | 🟢🟡 | Cartões + chat. Realtime do Supabase encurta muito. |
| Frontend 3D | 🔴 | Trabalhoso, baixo risco técnico, alto custo de polimento. Por último. |

**Estimativa honesta de cronograma:**
- **1 fim de semana:** Fases 1–2 + observabilidade básica, tudo em texto/CLI. Você vê dois agentes trocando mensagens de trabalho estruturadas por tick, com log de custo. Isso já é uma demo real.
- **+1 fim de semana:** Fase 3 (copa, eventos, relacionamento) + UI 2D. Aqui a experiência "escritório vivo" aparece de verdade.
- **+1–2 fins de semana:** 3D (Fase 4) e/ou integrações externas, conforme o que provar valer a pena.

O "escopo de fim de semana" do documento é otimista se você contar o MVP inteiro. É realista se você contar **o núcleo que valida a ideia**. Recomendo redefinir "MVP" como esse núcleo.

---

## 4. Feedback do schema

O schema está bom como ponto de partida. Ajustes, do mais importante pro mais cosmético:

1. **Falta a tabela mais importante pro seu objetivo: log de execução/custo do tick.** Sem ela você não tem o controle que pediu. Sugestão:
   ```sql
   CREATE TABLE tick_execucoes (
       id BIGSERIAL PRIMARY KEY,
       tick INT NOT NULL,
       agente_id INT REFERENCES agentes(id),
       modelo TEXT NOT NULL,             -- qual LLM foi usado
       contexto_prompt TEXT,             -- o que entrou (pra replay/debug)
       saida_bruta TEXT,                 -- resposta crua do LLM
       acao_parseada JSONB,              -- o JSON já validado (ou erro de parse)
       tokens_in INT, tokens_out INT,
       custo_usd NUMERIC(10,6),
       dry_run BOOLEAN DEFAULT FALSE,
       erro TEXT,                        -- se o parse/execução falhou
       criado_em TIMESTAMPTZ DEFAULT now()
   );
   ```
   Isso te dá: replay de qualquer tick, auditoria de custo por agente/dia, e diagnóstico quando um agente "surtar".

2. **Represente o chefe como uma linha em `agentes`** (ex: `especialidade = 'chefe'`), em vez de usar `NULL` em `relacionamentos`/`mensagens`. O truque do `NULL` parece elegante, mas:
   - quebra a intenção da constraint `UNIQUE (agente_id, alvo_agente_id)` (Postgres não trata dois `NULL` como iguais → dá pra duplicar relação com o chefe);
   - obriga `WHERE alvo IS NULL OR ...` espalhado no código.
   Com o chefe como agente, FKs, joins e unicidade ficam uniformes.

3. **Índices e unicidade que vão faltar sob carga:**
   ```sql
   CREATE UNIQUE INDEX ON relacionamentos (agente_id, alvo_agente_id);
   CREATE INDEX ON memorias (agente_id, tick_criado);
   CREATE INDEX ON mensagens (tipo, tick);
   CREATE INDEX ON mensagens (destinatario_id, tick);
   ```

4. **`TIMESTAMPTZ` em vez de `TIMESTAMP`.** Com WhatsApp/Calendar e "hora simulada" no jogo, timezone-aware evita bug chato depois. Custa nada trocar agora.

5. **`memorias`: adicione `tipo`** (`observacao` / `reflexao` / `plano`). É a estrutura do paper de Generative Agents e vai te ajudar quando adicionar reflexão. Deixe pgvector pra depois como você já previu ("vetorizável depois") — texto puro no MVP está certo.

6. **`mensagens`: um flag `lida_pelo_chefe BOOLEAN`** ajuda o resumo ("o que rolou desde a última vez que entrei").

7. **Snapshot de mundo no tick:** guardar o estado do mundo (hora simulada, eventos ativos) como JSONB na tabela `ticks` torna o replay determinístico.

Nada disso é bloqueante — é o tipo de coisa que dói se deixada pra depois.

---

## 5. Estratégia de LLM e custo (o ponto crítico)

Seu design de dois níveis está certo. Onde o custo realmente escapa é no **crescimento do contexto**: conforme a memória e o histórico de mensagens crescem, o prompt de cada tick cresce, e você paga isso **a cada tick, por agente, pra sempre**. Com 3 agentes e tick a cada 15 min, são ~288 chamadas/dia mesmo sem você fazer nada.

Defesas concretas (a maioria você já tem na filosofia, falta operacionalizar):
- **Teto de tokens de contexto por tick.** Resuma/trunque memória e histórico antes de montar o prompt. Nunca mande "toda a memória".
- **Resumo/compactação de memória.** Periodicamente colapse N memórias antigas numa síntese. Sem isso, o custo por tick cresce monotonicamente.
- **Orçamento diário com corte rígido.** Somando `custo_usd` da tabela de execuções: passou do teto → o relógio pausa sozinho. Isso é literalmente controle de custo virando código.
- **"Ocioso" é resposta válida e barata.** Você já tem a ação `ocioso` — incentive-a no prompt. Nem todo tick precisa gerar fala.
- **Cache de prompt** pra parte estável do system prompt (personalidade) reduz custo de entrada nas chamadas repetidas.
- **Batch/paralelismo consciente:** rode os N agentes de um tick em paralelo, mas com um limite, pra não disparar rajada de custo.

---

## 6. Como manter CONTROLE (sua exigência explícita)

Você disse que quer controle sobre o que está acontecendo e o que está sendo feito. Isso não sai de graça da arquitetura do documento — precisa ser projetado. Recomendações concretas, todas baratas de implementar e que mudam tudo na sua capacidade de dirigir o projeto:

1. **Modo passo-a-passo antes do agendado.** Um comando `tick --once` que avança **um** tick e imprime, pra cada agente: contexto que entrou → prompt → saída crua → ação parseada → efeitos aplicados → custo. Você roda na mão até confiar. Só depois liga o APScheduler.
2. **Dry-run.** `tick --once --dry-run` calcula tudo e **não persiste nem executa**. Essencial pra testar mudança de prompt sem sujar o mundo nem gastar em ações reais.
3. **Tudo logado e replayável** (tabela da seção 4). Qualquer comportamento estranho → você abre o tick e vê exatamente o que o agente recebeu e respondeu.
4. **Kill switch / pausa do relógio.** Um flag simples que congela os ticks. Combinado com o teto de orçamento, você nunca "acorda com a conta estourada".
5. **Gate de ação real no nível da ferramenta.** A confirmação do chefe (regra #1) não pode viver só no prompt — o agente pode alucinar que foi autorizado. A ferramenta que mexe em dinheiro/agenda deve **exigir** um token de confirmação que só a sua ação de UI gera. Prompt é política; a trava tem que ser mecânica.
6. **Painel de "o que rolou".** Mesmo em texto: resumo por tick do que cada agente fez + custo acumulado do dia. É o seu "entrar na cena" da Fase 5, e você pode tê-lo desde a Fase 2.

Esses seis itens são o que transforma "um monte de agentes rodando sozinhos" em "um sistema que eu dirijo e entendo".

---

## 7. Riscos e como mitigar

| Risco | Impacto | Mitigação |
|---|---|---|
| Custo de token acumulando | 🔴 Alto | Teto diário + compactação de memória + `ocioso` incentivado (seção 5). |
| Loop de fofoca repetitiva (agentes ecoando) | 🟡 | Limite de mensagens sociais por tick; injetar eventos novos; penalizar repetição no prompt. |
| Falha de parse do JSON | 🟡 | Structured output nativo + validação Pydantic + fallback pra `ocioso` + log do erro. |
| "Vazamento" de fofoca no canal de trabalho | 🟡 | Sua regra #4: nunca concatenar históricos; dois prompts/dois contextos separados. |
| Ação financeira indevida | 🔴 Alto | Gate mecânico de confirmação (seção 6, item 5). |
| 3D consumir todo o tempo e a ideia nunca ser validada | 🟡 | Adiar 3D; validar com UI 2D primeiro. |
| Perda de trabalho (ambiente efêmero) | 🟡 | Commitar cedo e sempre; migrations versionadas. |

---

## 8. Ordem de construção recomendada (ajuste das suas fases)

Suas fases estão bem ordenadas. Os únicos ajustes: **puxar observabilidade/custo pra dentro do núcleo** e **inserir uma Fase 0 de andaime**.

- **Fase 0 — Andaime.** docker-compose (Postgres), esqueleto FastAPI, migrations, UM agente hardcoded respondendo por endpoint. Prova que o encanamento funciona.
- **Fase 1 — Dados + 2 agentes.** Schema (com tabela de execução/custo) + Financeiro e Agenda respondendo via API. Sem tick, sem 3D.
- **Fase 2 — Tick + canal de trabalho + observabilidade.** Loop manual `tick --once`, mensagens estruturadas entre os dois, **log de custo e replay desde já**.
- **Fase 3 — Copa + eventos + relacionamento.** A alma da ideia. UI 2D aqui pra você *ver* acontecendo.
- **Fase 4 — 3D.** Upgrade de fantasia sobre um backend que já funciona.
- **Fase 5 — Chefe entra, resume, dá feedback.** Fecha o ciclo. (Boa parte disso você já terá do painel da Fase 2.)

---

## 9. Conclusão

- **A ideia é viável e vale a pena.** A combinação (tarefas reais + vida social simulada) é original e cada peça já é território conhecido.
- **A stack está majoritariamente válida.** Ajustes: adiar 3D, tratar LangGraph como opcional no MVP, considerar Supabase pelo realtime, empurrar integrações externas pra depois.
- **Dificuldade:** o núcleo é fácil/médio e cabe num fim de semana; o MVP completo do documento é médio e leva 2–4 fins de semana. Redefina "MVP" como o núcleo que valida a experiência.
- **Controle:** é a sua exigência e não vem de graça — projete observabilidade, custo e gates mecânicos como parte do núcleo, não como "depois". Os seis itens da seção 6 são o que te dão isso.

O maior erro possível aqui não é técnico — é gastar o primeiro fim de semana no 3D e nunca chegar a testar se a dinâmica social é interessante. Faça o núcleo em texto primeiro.
