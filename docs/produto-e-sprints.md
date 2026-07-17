# Hub de Agentes Pessoais ("Escritório Vivo") — Produto e Sprints

> Documento vivo. Atualizado a cada sprint concluída ou decisão de escopo
> relevante — não é uma fotografia única, é o registro contínuo de onde o
> projeto está e pra onde vai.

---

## 1. Visão geral do produto

### 1.1 Proposta e propósito

Um hub pessoal de agentes de IA especializados, cada um cuidando de uma
área da vida do usuário (finanças, agenda, saúde, projetos pessoais, e
mais no futuro), visualizados como colaboradores num escritório 2D/3D.
Diferente de um assistente genérico único, cada agente tem escopo
estreito, personalidade própria e um jeito de interagir desenhado pra
economia de custo e clareza — não existe "chat com tudo", existe o padrão
certo pra cada domínio (dashboard, forms, cards, chat roteado).

Inspiração declarada (ver `docs/mvp-hub-agentes.md`): hub de agentes por
especialidade (Qyon AI) + agentes generativos autônomos (linha de
pesquisa Stanford "Generative Agents") + a fantasia social de "The Sims"
aplicada a colaboradores de IA.

### 1.2 A dor que resolve

- **Fragmentação**: finanças, agenda, saúde e projetos pessoais vivem em
  apps/ferramentas diferentes, sem visão unificada nem lembrete cruzado.
- **Falta de controle sobre IA**: ferramentas de IA em geral não dão
  visibilidade de custo, não pedem confirmação antes de agir de verdade,
  e não são auditáveis — o usuário não sabe o que foi decidido nem por
  quê. Esse projeto trata isso como requisito desde o início, não como
  feature de "versão 2".
- **Procrastinação/abandono de projeto pessoal**: motivou diretamente o
  agente Norte — projetos começados e nunca terminados, sem ninguém de
  olho no que falta.
- **Fricção de acompanhamento manual**: registrar refeição, negociar
  horário, lançar gasto — tudo isso tem custo de atenção; o hub tenta
  reduzir esse custo sem trocar por outro custo pior (chat caro, ações
  automáticas sem controle).

### 1.3 Público-alvo (inicial)

**Uma pessoa: o próprio criador do sistema ("o chefe").** É
deliberadamente single-user — nenhum agente tem conceito de múltiplos
usuários, permissão ou autenticação multi-pessoa hoje. Expandir pra mais
usuários é uma decisão de arquitetura de hub inteiro, não um ajuste
isolado (ver `docs/backlog-futuro.md`), e não é objetivo desta fase.

### 1.4 O que ele afeta

Organização pessoal prática (dinheiro, tempo, saúde, projetos) e o
comportamento de quem usa — o objetivo declarado não é só "guardar dado",
é mudar o resultado real (ex: terminar mais projetos, ter menos surpresa
financeira, não perder compromisso). Efeito colateral desejado: um espaço
de experimentação com práticas de engenharia de agentes de IA
(guardrails, controle de custo, auditabilidade) que valem além deste
projeto específico.

### 1.5 Ciclo do projeto

Iterativo, módulo por módulo, nunca "tudo de uma vez":

1. **Idealizar** — o dono do produto descreve a necessidade e a essência
   do que quer resolver.
2. **Debater o desenho** — perguntas e contrapropostas até convergir:
   qual o padrão de interação, quando entra LLM vs. quando é
   determinístico, que guardrail o domínio exige, o que fica pra depois
   (backlog).
3. **Implementar** — só depois de aprovação explícita do desenho.
4. **Testar com rigor** — Postgres real, dado real sempre que possível,
   guardrails verificados com evidência (não "parece que funciona").
5. **Aprovar e documentar** — registrar decisões (backlog, frontend-design,
   este documento) antes de considerar o módulo pronto.

Esse ciclo é ele mesmo um resultado do projeto — ver
`docs/guia-criacao-de-agentes.md` pra ele formalizado como processo
repetível pra qualquer agente novo.

### 1.6 Resultados esperados (visão de médio prazo)

- Um conjunto de agentes especializados cobrindo as áreas centrais da
  vida pessoal, cada um validado com dado real, nunca "MVP de mentirinha".
- Dinâmica social real entre agentes (módulo de interação/motor de tick)
  — o "escritório vivo" de verdade, não quatro backends isolados.
- Interface visual (2D primeiro, 3D como evolução) que torna esse
  ecossistema tangível.
- Controle de custo e auditabilidade como propriedade do sistema, não
  como boa intenção — todo gasto de LLM é rastreável, toda ação real tem
  gate de confirmação quando mexe em sistema externo.

---

## 2. Sprints

### Sprint 0 — Idealização até o primeiro MVP (EM ANDAMENTO)

**Objetivo:** sair da ideia (documento MVP original, `docs/mvp-hub-agentes.md`
e `docs/avaliacao-mvp.md`) até ter uma base funcional, testada com dado
real, rodando sem problema grave. Cobre a fundação do hub + o **módulo de
agentes** (quatro agentes de domínio) e, pelo que já decidimos, também
absorve a introdução de testes automatizados antes de avançar pro próximo
módulo.

#### O que já foi feito

**Fundação:**
- Banco Postgres (psycopg3 + pool), schema versionado por migration
  (`db/migrations/001` a `007`), scripts `migrate`/`seed` idempotentes.
- Arquitetura em camadas consistente em todo o hub: `routers/` (HTTP
  fino) → `resolvers/` (regra de negócio + guardrails) → `utils/query_executor.py`
  (único ponto de acesso ao banco) → `sql/*.sql` (queries nomeadas,
  nunca inline).
- Tabelas de fundação já existentes mas **ainda não usadas por nenhum
  agente**: `mensagens`, `memorias`, `relacionamentos`, `tick_execucoes`
  — reservadas pras próximas etapas do módulo de interação (social e
  proatividade). `ticks` já está em uso pela Etapa 1 (ver abaixo).

**Módulo de agentes (quatro agentes, um por domínio):**

| Agente | Domínio | Padrão de interação | LLM usado onde |
|---|---|---|---|
| **Cifra** (Financeiro) | Upload de extrato, dashboard, relatório mensal | Painel/dashboard, sem chat | 1 chamada estruturada (narrativa do relatório) |
| **Agenda** | Google Calendar | Chat roteado por palavra-chave + gate de confirmação | Agente real com tools (`create_agent`), única exceção do hub |
| **Vita** (Saúde) | Perfil, peso, sono, hidratação, atividade, refeição, ficha de treino, plano de dieta, relatório semanal | Menu de forms determinísticos, sem chat | 4 chamadas estruturadas independentes (macro por foto/texto, plano, relatório) |
| **Norte** | Projetos do GitHub — um card de sugestão por vez | Sem chat, sem lista — 1 card ativo por projeto | 2 chamadas estruturadas (scan do projeto, gerar card) |

Detalhes de cada um, decisões de design e bugs reais encontrados/corrigidos
estão no histórico de commits de cada domínio (mensagens de commit
descritivas) e em `docs/backlog-futuro.md` (o que foi adiado
deliberadamente).

**Guardrails e práticas consolidadas** (ver `docs/guia-criacao-de-agentes.md`
pro catálogo completo): checagem determinística ANTES de qualquer chamada
cara (nunca gasta LLM só pra descobrir depois que uma ação está
bloqueada), teto de tool-calling + recursion_limit pro único agente com
loop de raciocínio (Agenda), checagem de consistência aritmética
pós-LLM (Saúde, calorias vs. macros), truncamento determinístico de
limites (Norte, stack ≤ 10 itens), rejeição de saída vaga via schema
(`Field(min_length=1)`), nunca retry automático de chamada de LLM que
falhou, custo (modelo/tokens/custo_usd) sempre persistido mesmo quando
não exposto ao chefe.

**Módulo de interação — Etapa 1 (relógio simulado, fundação):**
- `resolvers/tick.py` + `routers/tick.py` + `sql/ticks.sql`: relógio
  simulado (`ticks.numero`, `ticks.hora_simulada`, avança
  `tick_minutos_simulados` por tick), atualização do `estado` dos
  agentes tipo `colaborador` ativos (sempre `idle` nesta etapa — ainda
  não há comportamento real que justifique `pensando`/`falando`/
  `executando`), e cálculo de orçamento diário já gasto (soma
  `custo_usd` de todas as tabelas de domínio que já rastreiam custo de
  LLM: `relatorios_financeiros`, `refeicoes`, `planos_dieta`,
  `relatorios_saude`, `cards`) vs. `orcamento_diario_usd`.
- Disparo é manual via `POST /tick/avancar` (nunca scheduler automático
  ainda — mesma disciplina "nunca automático até provar que é seguro"
  do resto do hub), com suporte a `dry_run=true` pra conferir sem
  gravar nada.
- Zero chamada de LLM nesta etapa — é só a fundação (relógio + estado +
  orçamento) que as próximas etapas (social, depois proatividade) vão
  usar antes de gastar qualquer coisa.
- 11 testes novos (`tests/test_tick.py`), rodados contra Postgres real
  duas vezes seguidas pra confirmar repetibilidade.

**Documentação já existente:**
- `docs/backlog-futuro.md` — ideias adiadas deliberadamente, com o porquê.
- `docs/frontend-design.md` — decisões de UI/UX por agente + requisitos
  funcionais/não funcionais, pro módulo de frontend (futuro) ter norte
  claro.

#### Módulos que serão adicionados (fora do escopo desta sprint)

- **Testes automatizados** — decidido fazer AGORA, antes do módulo de
  interação (ver seção 2.2 abaixo), justamente porque o próximo módulo
  mexe em infraestrutura compartilhada por todos os agentes.
- **Módulo de interação** (motor de tick) — dividido em 3 etapas pra
  não acumular risco: **Etapa 1 (relógio simulado) feita** — ver
  acima. **Etapa 2 (social)** e **Etapa 3 (proatividade de trabalho por
  domínio)** ainda não desenhadas em detalhe — cada uma passa pelo
  mesmo processo de debate/aprovação antes de virar código, uma de
  cada vez.
- **Módulo de frontend** — 2D primeiro, ver `docs/frontend-design.md`.
  Backend segue sendo priorizado antes.
- **Quinto agente (e mais)** — confirmado que vai existir, sem data
  definida. Não entra nesta sprint.
- **Norte, refinamento contínuo** — é o agente mais novo e o menos
  "blindado" dos quatro (contexto raso de leitura de repositório, ainda
  vai precisar de leitura mais profunda de código — já registrado como
  prioridade em `docs/backlog-futuro.md`). Tratar como o que mais recebe
  ajuste nas próximas rodadas, não como "pronto e esquecido".

#### O que falta para concluir esta sprint

1. ~~Suíte de testes automatizados cobrindo os quatro agentes~~ —
   **feita**: `pytest` + `pytest-asyncio` + `unittest.mock`/`pytest-mock`,
   reaproveitando o Postgres do `docker-compose.yml` (banco
   `<nome>_test` separado, recriado a cada rodada) — nenhum container
   novo, nenhuma chamada de LLM/API externa real. Ver seção "Testes" do
   `README.md` e `tests/`.
2. ~~Confirmar que a fundação (banco, scripts, camadas) aguenta a
   introdução do módulo de interação sem retrabalho estrutural~~ —
   **confirmada**: Etapa 1 do motor de tick usou a mesma arquitetura em
   camadas e as tabelas já reservadas (`ticks`) sem precisar mexer em
   nada estrutural. Suíte total agora com 59 testes, rodada duas vezes
   seguidas contra Postgres real.

Depois disso, Sprint 0 é considerada encerrada e o módulo de interação
começa oficialmente (com sua própria rodada de debate de design).

#### Resultado esperado desta sprint

Uma base de quatro agentes funcionando de forma confiável e testada,
seguindo um processo replicável (ver guia de criação de agentes), com
infraestrutura compartilhada estável o suficiente pra suportar o próximo
módulo sem gerar retrabalho.

#### Stack técnica (Sprint 0)

- **Backend**: Python, FastAPI, Uvicorn.
- **Banco**: PostgreSQL (psycopg3 + `psycopg_pool.ConnectionPool`, pool
  em autocommit).
- **LLM**: OpenAI via LangChain (`langchain`, `langchain-openai`) —
  `init_chat_model` + `.with_structured_output(..., include_raw=True)`
  como padrão dominante; `create_agent` (LangGraph por baixo) só onde
  há raciocínio real de verdade (Agenda).
- **Integrações externas**: Google Calendar (`google-api-python-client`,
  OAuth "Desktop app"), GitHub API (Device Flow OAuth, biblioteca
  `requests` pura, sem SDK).
- **Parsing de arquivo**: `pdfplumber` (extrato Itaú em PDF), CSV nativo
  com detecção de delimitador (Nubank).
- **Validação de contrato**: Pydantic v2 (schemas de entrada de router e
  de saída estruturada de LLM).
- **Sem framework de frontend ainda** — planejado React + Vite pro
  módulo de frontend (2D), ver `docs/avaliacao-mvp.md`.
- **Motor de tick (Etapa 1)**: `resolvers/tick.py` + `routers/tick.py`
  — relógio simulado manual, sem scheduler automático ainda (ver
  `docs/backlog-futuro.md` pra quando isso mudar). Etapas 2 (social) e
  3 (proatividade) ainda não implementadas.
- **Testes**: `pytest` + `pytest-asyncio` (resolvers são majoritariamente
  `async`) + `unittest.mock`/`pytest-mock` (mocka LLM e API externa,
  nunca o banco) — suíte reaproveita o Postgres do `docker-compose.yml`
  já existente, banco de teste separado por sufixo `_test`.

---

*(Próximas sprints serão adicionadas a este documento conforme
iniciarem — este arquivo não é reescrito do zero a cada atualização, é
incrementado.)*
