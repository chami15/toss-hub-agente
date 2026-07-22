# Backlog — ideias adiadas de propósito

Ideias discutidas durante o design dos agentes que fazem sentido, mas foram
deliberadamente deixadas fora do escopo atual. Registradas aqui pra não se
perderem e pra já vir com o contexto do porquê foram adiadas.

---

## Canal de mensagem (Telegram/WhatsApp) para lançar gasto avulso — Agente Financeiro

**Ideia:** deixar o usuário mandar uma mensagem tipo "gastei 45 reais no mercado
hoje" pelo Telegram ou WhatsApp (Evolution API, já citada no MVP original) e o
Financeiro parseia isso (bom caso de uso de LLM: texto livre -> dado
estruturado) e contabiliza como uma transação, sem esperar o extrato mensal.

**Por que foi adiada (não é só "mais trabalho"):** isso cria um problema real
de integridade de dado, não só uma tela a mais. Se o gasto for lançado
manualmente pelo canal E também aparecer depois no extrato do cartão (porque
foi no cartão), ele conta **duas vezes** a menos que exista uma etapa de
reconciliação entre lançamento manual e a linha do extrato. Essa etapa não
existe hoje e precisa ser desenhada antes de implementar o canal, não depois.

**O que vai precisar quando for retomada:**
- Campo `origem` em `transacoes` (`manual` | `extrato`) para diferenciar a
  procedência de cada linha.
- Uma lógica de casamento (matching) entre lançamento manual e a transação
  correspondente do extrato quando ele chegar — por proximidade de data/valor,
  provavelmente com confirmação do usuário nos casos ambíguos, não automático.
- Decidir o que mostrar no relatório enquanto uma transação manual ainda não
  foi "casada" com o extrato (ela conta pro mês corrente, mas fica marcada
  como não conciliada).
- Escolha entre Telegram Bot API (mais simples de integrar) ou a Evolution
  API do WhatsApp (já usada em outras integrações do hub) como canal de
  entrada.

**Status:** não iniciado. Agente Financeiro atual (versão inicial) é
100% leitura/análise/relatório a partir do extrato mensal — sem escrita.

---

## Open Finance (conexão bancária automática)

**Ideia:** conectar direto com o banco via Open Finance (Pluggy, Belvo ou
similar) em vez do usuário exportar e subir o CSV/extrato manualmente.

**Por que foi adiada:** superfície de segurança/compliance real (autenticação
bancária, tokens de acesso a dado financeiro sensível), custo de API paga por
conexão, e não é o que valida a experiência do MVP — o upload manual já
resolve o objetivo de ter o relatório e os KPIs.

**Status:** não iniciado, sem previsão. Reavaliar só se o upload manual se
mostrar um atrito real de uso no dia a dia.

---

## Buscar lugares próximos (sugestão de restaurante/local) — Agente Agenda

**Ideia:** quando o agente estiver negociando um compromisso do tipo
"jantar"/"encontro" e ainda não houver um local definido, ele pergunta "já tem
ideia de onde?" — se a resposta for não, sugere restaurantes próximos
(provavelmente via Google Places API ou similar).

**Por que foi adiada:** é uma tool nova (busca de lugar) e mais uma API externa
pra configurar (credencial própria, custo por chamada) — o núcleo do agente
(negociar horário, criar/mover/cancelar evento com confirmação) precisa
funcionar e ser validado primeiro.

**O que vai precisar quando for retomada:**
- Tool `buscar_locais_proximos(tipo_lugar, localizacao)` — provavelmente
  Google Places API (já que já estamos no ecossistema Google pro Calendar).
- Decidir se a sugestão de local também passa pelo gate de confirmação (não
  é uma ação real no calendário, é só uma sugestão — provavelmente não precisa
  do mesmo rigor, mas vale pensar).
- Encaixe no fluxo de negociação existente: mais uma pergunta objetiva antes
  da proposta final de evento, não abre uma ramificação de conversa nova.

**Status:** não iniciado. Agente Agenda atual cuida só de horário/conflito de
agenda, sem sugestão de local.

---

## Canal Telegram para o agente de Saúde (e potencialmente outros)

**Ideia:** o protótipo original que inspirou o agente de Saúde (bot
nutricionista) rodava 100% via Telegram (Pyrogram), inclusive recebendo foto
de prato direto por lá. Faria sentido esse ser o canal de entrada real no
dia a dia (mais rápido que abrir a API/frontend pra mandar uma foto).

**Por que foi adiada:** decidimos manter o agente de Saúde na mesma API do
resto do hub por enquanto (forms/menu, sem chat livre) — evita construir uma
integração de canal bespoke por agente antes de validar o núcleo (registro,
plano, relatório). Como Financeiro também já cogitou Telegram/WhatsApp pra
lançar gasto avulso (ver primeiro item deste arquivo), faz mais sentido
desenhar isso como uma camada de canal genérica, compartilhada entre agentes,
quando for retomada — não uma integração por agente.

**O que vai precisar quando for retomada:**
- Decidir a camada de canal (Telegram Bot API oficial, não Pyrogram/MTProto
  como no protótipo — mais simples e não exige sessão de usuário) de forma
  genérica, capaz de rotear pra qualquer agente do hub, não só Saúde.
- Upload de foto via Telegram precisa cair no mesmo endpoint de análise de
  refeição que a API já expõe — o canal só troca a forma de entrada, não a
  lógica.

**Status:** não iniciado. Agente de Saúde atual (inicial) usa forms/menu na
mesma API do hub, sem chat livre e sem canal externo.

---

## Agente de Saúde sugerir/montar a ficha de treino sozinho

**Ideia:** hoje (v1) o chefe cadastra a própria ficha de treino (dia da
semana -> grupo muscular -> exercícios com séries/repetições) via
`PUT /saude/ficha-treino` — é só escrita estruturada, sem LLM. A ideia é o
agente evoluir pra também SUGERIR/montar a ficha sozinho, tipo um personal
trainer de verdade — mesma lógica que já existe pra `gerar_plano_dieta`
(uma chamada estruturada usando o perfil como contexto), só que pra treino.

**Por que foi adiada:** o núcleo do agente (registro determinístico +
estimativa de macro de refeição + plano de dieta + relatório semanal)
precisa validar primeiro. Reaproveita boa parte do desenho já existente
quando for retomada (mesmo padrão de chamada estruturada única do
`gerar_plano_dieta`).

**O que vai precisar quando for retomada:**
- Uma função `agents/saude/agente.py:gerar_ficha_treino(perfil)` nos
  mesmos moldes de `gerar_plano_dieta` — schema estruturado (dias, grupos
  musculares, exercícios com séries/repetições), sem tool-loop.
- Decidir se o agente GERA a ficha inteira do zero ou só sugere ajustes em
  cima do que o chefe já cadastrou manualmente (provavelmente mais útil:
  sugerir sobre o que já existe, não substituir sem avisar).

**Status:** não iniciado. `ficha_treino_dias`/`ficha_treino_exercicios` já
existem no schema (com histórico via `ativo`), só a escrita manual está
implementada.

---

## Acesso multi-usuário ao agente Norte (colaborar em cards)

**Ideia:** quando o uso escalar, outras pessoas (não só o chefe) poderem
acessar um projeto no Norte e criar/resolver cards nele — útil se um
projeto pessoal virar algo com colaboradores.

**Por que foi adiada:** o hub inteiro hoje é single-user (o chefe) — não
existe conceito de múltiplos usuários, autenticação ou permissão em
NENHUM agente ainda. Introduzir isso só pro Norte seria inconsistente com
o resto do hub; se for retomado, é uma decisão de arquitetura do hub como
um todo (autenticação real), não um ajuste isolado de uma tabela.

**Status:** não iniciado. V1 do Norte é single-user, igual todo o resto.

---

## Leitura mais profunda do repositório no agente Norte

**Ideia:** a v1 do Norte manda pro LLM só um contexto raso na hora de
gerar um card — estrutura de pastas de alto nível (não recursiva),
README, manifest (package.json/pyproject.toml) e nomes (não conteúdo) dos
arquivos alterados recentemente. Se a qualidade das sugestões não for boa
o suficiente com isso, o próximo passo é ler o CONTEÚDO de fato dos
arquivos alterados recentemente (ou um subconjunto relevante) antes de
sugerir o card.

**Por que foi adiada:** é bem mais caro (mais tokens por chamada) e mais
complexo — provavelmente precisaria virar um agente com tool-calling
(explorar quais arquivos vale a pena ler) em vez da chamada estruturada
única que a v1 usa, exigindo os mesmos guardrails de recursion_limit que
já usamos no Agenda. Decisão deliberada: começar raso, validar qualidade
das sugestões primeiro, só aprofundar se necessário.

**Confirmado que é necessário** (teste real com o repositório toss-flow,
ver conversa de design): o primeiro card gerado sugeriu implementar uma
funcionalidade (upload de planilha) que a própria `descricao` do projeto
já dizia existir — o Norte não tem como saber o que já está implementado
de fato sem ler o código, só o resumo compacto (descricao/arquitetura/
README). Foi adicionada uma regra de prompt pra mitigar o caso óbvio
(nunca contradizer a própria descricao/arquitetura), mas isso não
resolve o problema de raiz — só a leitura de conteúdo real resolve.
**O chefe confirmou que isso é prioridade pra próxima sprint, não "algum
dia".**

**Status:** não iniciado, mas confirmado como necessário e priorizado
pra próxima sprint. V1 do Norte usa só o contexto raso descrito acima.

---

## Pipeline de CI no GitHub (rodar a suíte de testes automaticamente)

**Ideia:** GitHub Actions rodando `pytest` a cada push/PR na branch
`agentes` (e depois `main`), pegando regressão antes de chegar no chefe
testar manualmente.

**Por que foi adiada:** a suíte de testes local (ver
`docs/produto-e-sprints.md`, Sprint 0) reaproveita o Postgres do
`docker-compose.yml` que o chefe já sobe manualmente na máquina dele —
não existe isso num runner do GitHub Actions, então o pipeline de CI
precisa de uma estratégia diferente de banco, não a mesma da suíte
local.

**O que vai precisar quando for retomada:**
- Um `.github/workflows/testes.yml` que sobe um Postgres efêmero **no
  próprio runner** — duas opções: (a) o serviço `postgres` nativo do
  GitHub Actions (`jobs.<job>.services`, mais simples, não precisa de
  biblioteca nova) ou (b) `testcontainers` (mesma lib cogitada e
  descartada pra uso local, mas que faz mais sentido aqui, já que o
  runner do GitHub Actions tem Docker disponível por padrão e não há
  `docker compose up -d` manual pra reaproveitar).
- Rodar `scripts.migrate` + a suíte `pytest` contra esse banco efêmero.
- Nunca rodar teste end-to-end de verdade (API real do GitHub/OpenAI) no
  CI — custaria token a cada push. Só os níveis 1-3 (unitário, integração
  com LLM mockado, contrato HTTP) descritos na conversa de design da
  suíte de testes.
- Decidir o gatilho: todo push, só em PR, ou só antes de merge — e se
  quebrar o pipeline deveria bloquear o merge (branch protection) ou só
  avisar.

**Status:** não iniciado. Suíte de testes local é pré-requisito (feita
primeiro, ver Sprint 0).

---

## Afinidade sensível ao conteúdo/sentimento da conversa — módulo de interação

**Ideia:** hoje (Etapa 2, camada social) a afinidade entre dois agentes
cresce só pela frequência de troca de mensagem (fórmula de retorno
decrescente, ver conversa de design). A ideia adiada é fazer o
*tamanho* do ganho de afinidade variar de acordo com o teor da
conversa — ex: falar de assuntos específicos ou uma mensagem com tom
mais "caloroso" renderia mais afinidade do que uma troca genérica.

**Por que foi adiada:** fazer isso direito exige ou uma chamada de LLM
extra por mensagem só pra classificar sentimento/tópico (dobra o custo
de cada interação social) ou uma heurística de palavra-chave (frágil,
fácil de furar e de dar resultado estranho). Decisão: validar primeiro
a mecânica simples de frequência com retorno decrescente rodando de
verdade, e só depois avaliar se vale a pena adicionar essa camada.

**Status:** não iniciado. Pré-requisito: Etapa 2 (camada social) do
motor de tick rodando de forma estável.

---

## Calendário fictício completo — motor de tick

**Ideia:** ir além do fato simples de dia-da-semana/período do dia
(derivado de `ticks.hora_simulada`, isso já entra na Etapa 2) e simular
de verdade a passagem do tempo dentro do "escritório vivo" — X ticks
equivalendo a um dia fictício, Y ticks a uma semana fictícia, e assim
por diante, com um calendário interno completo (estações, feriados
fictícios, etc.). O objetivo é os próprios agentes terem uma base
temporal rica pra se orientar e conversar (saber se é dia ou noite, que
dia da semana fictício é, potencialmente até época do ano fictícia),
não só o chefe observando de fora.

**Por que foi adiada:** é uma feature grande por si só, que merece
debate de design próprio (quanto tempo fictício cada tick representa,
como isso se relaciona com `tick_minutos_simulados` já existente, se
afeta comportamento dos agentes ou é só contexto passivo, se vale a
pena ter feriados/estações fictícios). Misturar isso com o fechamento
simples da Etapa 2 (dia da semana + período do dia) ou com o começo da
Etapa 3 ia acumular risco demais de uma vez só — mesma disciplina de
etapas que guia todo o módulo de interação.

**Status:** não iniciado. Ideia confirmada pelo chefe como prioridade
da próxima sprint (não "algum dia") — retomar com debate de design
próprio antes de qualquer código.

---

## Trabalho formal entre agentes (não só agente→chefe) — módulo de interação

**Ideia:** hoje (Etapa 3) `mensagens.tipo='trabalho'` é escopado só pra
agente→chefe (alertas/atualizações proativas, ex: Norte avisando de
card gerado por estagnação). A ideia adiada é permitir mensagem
formal de trabalho **entre agentes** também — ex: a Cifra avisando
formalmente a Agenda sobre algo relevante aos dois domínios, uma
coordenação de verdade entre colaboradores, não só fofoca social.

**Por que foi adiada:** ainda não existe nenhum caso de uso concreto
("por que a Cifra precisaria mandar um recado formal pra Agenda? que
decisão isso dispara?"). Decisão: manter o escopo da Etapa 3 enxuto
(só agente→chefe) até aparecer uma razão real de coordenação entre
domínios que justifique essa mensagem.

**Status:** não iniciado. Pré-requisito: Etapa 3 (proatividade de
trabalho) rodando de forma estável, e um caso de uso real identificado.

---

## Rate limits baseados em dia SIMULADO, não em dia real — módulo de interação

**Ideia:** hoje todos os tetos diários do motor de tick (rate limit de
mensagens sociais por par, teto de avisos proativos de trabalho por
agente, orçamento diário) são calculados a partir do **dia real**
(`datetime.now()`), porque o disparo do tick ainda é sempre manual —
não existe "um dia" simulado consistente pra usar como referência
ainda. Quando o relógio simulado virar automático (ver backlog do
motor de tick / `tick_intervalo_min` já existente em `config.py`), com
uma cadência definida de ticks por dia fictício (ex: 24 ticks = 1 dia),
esses tetos deveriam passar a ser calculados em cima do dia SIMULADO
(`ticks.hora_simulada`), não mais do relógio real — senão alguém
disparando muitos ticks manualmente num único dia real burla o teto
pretendido, e o inverso (poucos ticks num dia real longo) faz o teto
resetar sem o "dia" fictício ter de fato avançado o suficiente.

**Por que foi adiada:** só faz sentido migrar isso depois que existir
uma cadência automática de tick definida — antes disso não tem "dia
simulado" real pra basear o cálculo, só o disparo manual que já
temos.

**Status:** não iniciado. Pré-requisito: automação do disparo do tick
(ver backlog de `tick_intervalo_min`) e definição de quantos ticks
equivalem a um dia fictício.
