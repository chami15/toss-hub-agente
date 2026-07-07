# Backend — Hub de Agentes

Fatia atual (fundação): banco + schema + scripts + API de leitura.
Ainda **sem** motor de tick e **sem** LLM — isso é a próxima fatia.

## Como subir

```bash
cd backend

# 1) Sobe o Postgres (e o Adminer em http://localhost:8080 pra ver o banco)
docker compose up -d

# 2) Ambiente Python
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 3) Config
cp .env.example .env      # ajuste se precisar

# 4) Cria o schema e popula os agentes iniciais
python -m scripts.migrate
python -m scripts.seed

# 5) Sobe a API
uvicorn app.main:app --reload
```

## Conferindo

- `http://localhost:8000/health` → `{"status":"ok"}`
- `http://localhost:8000/agentes` → lista com Você (chefe), Cifra (financeiro), Agenda
- `http://localhost:8000/docs` → Swagger de todas as rotas
- `http://localhost:8080` → Adminer, pra inspecionar as tabelas na mão
  (sistema: PostgreSQL · servidor: `db` · usuário: `hub` · senha: `hub` · base: `hub_agentes`)

## Estrutura

```
app/
  config.py              # settings via .env (banco, LLM, tick, orçamento)
  db/
    connection.py        # conexão psycopg (SQL puro, sem ORM)
    migrations/          # .sql versionados, aplicados em ordem
  api/
    routes_agents.py     # GET /agentes   (o front lê o escritório daqui)
    routes_mensagens.py  # GET /mensagens (canais trabalho/social)
  main.py                # app FastAPI
scripts/
  migrate.py             # aplica as migrations (idempotente)
  seed.py                # cria agentes + relacionamentos-base (idempotente)
docker-compose.yml       # postgres + adminer
```

## Próxima fatia (a combinar)

Motor de tick + cliente LLM (OpenAI) + saída estruturada + log de custo em
`tick_execucoes` + modo `tick --once`/`--dry-run` para você rodar na mão.
