# MVP — Hub de Agentes de IA Pessoais ("Escritório Vivo")

## 1. Visão Geral

Um hub pessoal de agentes de IA, cada um especializado em uma área da vida do usuário (financeiro, agenda, etc), representados visualmente num espaço 3D tipo escritório. Além de executar tarefas reais, os agentes simulam uma dinâmica de "colaboradores de empresa": trocam mensagens de trabalho entre si, socializam informalmente (copa), desenvolvem relacionamento entre eles e opiniões sobre o usuário (o "chefe") — tudo rodando com pouca ou nenhuma necessidade de interação humana constante.

**Inspiração declarada:** conceito de agentes especializados da Qyon AI (hub de agentes por especialidade), combinado com mecânica de agentes generativos autônomos (linha de pesquisa "Generative Agents / Smallville", Stanford) e a fantasia de "The Sims" aplicada a colaboradores de IA.

**Diferencial em relação à Qyon:** os agentes não ficam presos a uma plataforma proprietária — eles se conectam diretamente às fontes de dados reais do usuário (Postgres próprio, Google Calendar, WhatsApp via Evolution API).

---

## 2. Objetivo do MVP

Validar, num escopo de fim de semana, se a experiência de "escritório vivo" é viável tecnicamente e agradável de usar — sem tentar resolver simulação social perfeita.

### Dentro do escopo (MVP)
- 2–3 agentes especializados (ex: Financeiro, Agenda, Social/Copa como observador)
- Personalidade e tom de voz distintos por agente (via prompt)
- Execução de tarefas reais em pelo menos 1 domínio (ex: consultar/lançar gasto no Postgres)
- Mecanismo de "tick" autônomo desacoplado do tempo real
- Dois canais de mensagem: **trabalho** (estruturado, visível, funcional) e **social/copa** (informal, fofoca, opinião sobre o chefe)
- Estado de relacionamento simples entre agentes (score + memória textual)
- Visualização 3D básica (avatares/estados: idle, pensando, falando)
- Você (chefe) pode entrar na cena e ver histórico ou receber resumo

### Fora do escopo (não-MVP)
- Simulação espacial real (pathfinding, física, movimento livre)
- Múltiplos LLMs rodando em paralelo sem controle de custo
- Ações financeiras reais irreversíveis sem confirmação humana
- Emoção/personalidade emergente complexa (fica tudo em prompt + score, nada de "modelo de emoção")
- Voz, animação facial, lip-sync

---

## 3. Arquitetura

```
┌─────────────────────────────────────────────┐
│                Frontend (Hub 3D)             │
│   React + React Three Fiber + Vite           │
│   - Avatares por agente, estado visual        │
│   - Painel de chat (canal trabalho / copa)   │
└───────────────────┬───────────────────────────┘
                     │ REST / WebSocket
┌───────────────────▼───────────────────────────┐
│              Backend (FastAPI)                │
│  - Orquestrador (LangGraph)                    │
│  - Scheduler de ticks (APScheduler/cron)       │
│  - Agentes especializados (nós/subgrafos)      │
│  - Fila de mensagens inter-agentes              │
└───────────────────┬───────────────────────────┘
                     │
┌───────────────────▼───────────────────────────┐
│                PostgreSQL                      │
│  agentes, memórias, relacionamentos,           │
│  mensagens, eventos_mundo, ticks                │
└─────────────────────────────────────────────────┘
                     │
        Integrações externas (por agente)
        Google Calendar (MCP) · WhatsApp (Evolution API) · dados financeiros próprios
```

### 3.1 Orquestrador
- LangGraph como grafo supervisor: recebe input (seu ou de tick) e roteia pro(s) agente(s) certo(s).
- Cada agente especializado = nó/subgrafo com: prompt de sistema (personalidade + função), ferramentas próprias, acesso à própria fatia de memória.

### 3.2 Motor de tick (o "relógio do escritório")
- Tempo simulado desacoplado do tempo real (ex: 1 tick = 1h simulada, disparado a cada 15 min reais — configurável).
- A cada tick, cada agente recebe um pacote de contexto:
  - Resumo da memória recente do próprio agente
  - Mensagens recebidas desde o último tick (do chefe ou de outros agentes)
  - Estado do mundo (hora simulada, eventos aleatórios do dia: "prazo apertado", "cafeteira quebrou")
  - Estado de relacionamento com cada colega
- Saída do agente é **estruturada** (JSON), nunca texto livre solto:
  ```json
  {
    "acao": "trabalhar | mensagem_trabalho | mensagem_social | refletir | ocioso",
    "alvo": "id_do_agente_ou_null",
    "conteudo": "texto da mensagem, se aplicável",
    "atualiza_memoria": "resumo opcional a persistir"
  }
  ```
- Modelo pequeno/barato para a maioria dos ticks (decisão de ação); escala para modelo forte apenas quando a ação é execução real (mexer em dado financeiro de verdade, por exemplo).

### 3.3 Canais de comunicação
| Canal | Visibilidade | Conteúdo | Tom |
|---|---|---|---|
| Trabalho | Sempre visível ao chefe | Coordenação factual entre agentes ("orçamento aprovado, pode marcar viagem") | Estruturado |
| Social/Copa | Visível sob demanda ou em resumo | Fofoca, opinião sobre colegas, opinião sobre o chefe, comentário sobre eventos aleatórios do dia | Informal, livre, com personalidade |

Ambos os canais moram na mesma tabela `mensagens`, diferenciados por `tipo`.

### 3.4 Relacionamento e opinião
- Cada par de agentes tem um score de afinidade (-100 a 100) + uma memória textual curta ("acha o financeiro controlador").
- Cada agente também guarda opinião sobre o chefe (ex: se ignorado por muitos ticks, isso vira tópico de fofoca na copa).
- Atualização de score é incremental, feita pelo próprio agente ao final de uma interação social (parte do output estruturado do tick).

---

## 4. Stack Proposta

| Camada | Tecnologia | Motivo |
|---|---|---|
| Orquestração de agentes | LangGraph | Você já usa no EVAL, multi-agente nativo |
| Backend/API | FastAPI | Leve, já familiar |
| Banco | PostgreSQL | Já é seu padrão, schemas separados por domínio |
| Frontend | React + Vite + React Three Fiber | Renderização 3D leve, sem precisar de engine pesada |
| Scheduler | APScheduler (ou cron simples) | Motor de tick desacoplado do tempo real |
| Integrações | MCP (Google Calendar), Evolution API (WhatsApp) | Você já tem ambos rodando |
| Containerização | Docker / docker-compose | Padrão seu, facilita subir tudo local |
| LLM | Modelo pequeno para decisão de tick + modelo forte para execução real | Controle de custo |

---

## 5. Schema de Banco de Dados (proposta inicial)

```sql
-- Cada colaborador/agente
CREATE TABLE agentes (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    especialidade TEXT NOT NULL,           -- 'financeiro', 'agenda', etc
    personalidade TEXT NOT NULL,           -- prompt base de personalidade
    avatar_config JSONB,                   -- cor, modelo 3d, estado visual
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT now()
);

-- Memória de cada agente (vetorizável depois, texto puro no MVP)
CREATE TABLE memorias (
    id SERIAL PRIMARY KEY,
    agente_id INT REFERENCES agentes(id),
    conteudo TEXT NOT NULL,
    importancia SMALLINT DEFAULT 1,        -- 1-10, pra futura priorização
    tick_criado INT,
    criado_em TIMESTAMP DEFAULT now()
);

-- Relacionamento entre pares de agentes (e chefe = agente_id NULL representa "sobre o usuário")
CREATE TABLE relacionamentos (
    id SERIAL PRIMARY KEY,
    agente_id INT REFERENCES agentes(id),
    alvo_agente_id INT REFERENCES agentes(id) NULL,  -- NULL = relação com o chefe
    afinidade SMALLINT DEFAULT 0,           -- -100 a 100
    opiniao TEXT,                           -- resumo textual curto, atualizado incrementalmente
    atualizado_em TIMESTAMP DEFAULT now()
);

-- Mensagens (trabalho e social, mesma tabela)
CREATE TABLE mensagens (
    id SERIAL PRIMARY KEY,
    remetente_id INT REFERENCES agentes(id),
    destinatario_id INT REFERENCES agentes(id) NULL,  -- NULL = mensagem pro chefe
    tipo TEXT CHECK (tipo IN ('trabalho', 'social')) NOT NULL,
    conteudo TEXT NOT NULL,
    tick INT,
    criado_em TIMESTAMP DEFAULT now()
);

-- Eventos aleatórios do mundo simulado (dão munição pra conversa social)
CREATE TABLE eventos_mundo (
    id SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    tick INT,
    criado_em TIMESTAMP DEFAULT now()
);

-- Controle do relógio simulado
CREATE TABLE ticks (
    id SERIAL PRIMARY KEY,
    numero INT UNIQUE NOT NULL,
    hora_simulada TIMESTAMP,
    processado_em TIMESTAMP DEFAULT now()
);
```

---

## 6. Restrições e Padrões do Projeto

1. **Nenhuma ação real irreversível sem confirmação explícita do chefe** — vale especialmente para o agente financeiro (nunca move dinheiro de verdade sozinho).
2. **Saída de agente em tick sempre estruturada (JSON)** — nunca texto livre direto, pra evitar alucinação de consenso e permitir parsing seguro.
3. **Modelo pequeno por padrão, modelo forte só quando necessário** — controle de custo é requisito, não detalhe.
4. **Separação rígida entre canal de trabalho e canal social** — mesmo banco, mas nunca misturar contextos no prompt (evita agente "vazar" fofoca pra dentro de uma resposta de trabalho).
5. **Frequência de tick configurável e limitada** — nada de rodar tick a cada poucos segundos; custo e ruído sobem rápido.
6. **Personalidade fixada em prompt versionado** — mudanças de personalidade são deliberadas (arquivo/registro), não emergem sozinhas.
7. **Toda opinião/relacionamento é score + texto curto, nunca "modelo de emoção"** — mantém simples e depurável.
8. **Idioma padrão: português brasileiro**, tom direto, sem jargão de agência (alinhado ao seu padrão de comunicação).

---

## 7. Fases Sugeridas

| Fase | Entregável |
|---|---|
| 1 | Schema no Postgres + 2 agentes (Financeiro, Agenda) respondendo via API, sem tick nem 3D |
| 2 | Motor de tick rodando, canal de trabalho funcionando (mensagens estruturadas entre os 2 agentes) |
| 3 | Canal social/copa + eventos aleatórios + score de relacionamento |
| 4 | Frontend 3D básico consumindo o backend (avatares + estados) |
| 5 | Você entra na cena, vê histórico, dá feedback — ciclo de relatório pra ajuste |

---

## 8. Próximos Passos

Projeto será movido para Claude Code a partir daqui. Relatórios de progresso serão trazidos de volta pra este chat para validação e ajuste de direção.
