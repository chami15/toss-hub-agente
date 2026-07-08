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

## Troubleshooting

**`password authentication failed for user "hub"`**
Geralmente significa que quem está respondendo na porta não é o container —
é outro Postgres (nativo, comum no Windows se você já tem PostgreSQL/pgAdmin
instalado, ou outro projeto seu). Por isso o `docker-compose.yml` publica o
container na porta **5000** do host (o container continua ouvindo 5432
*dentro* dele; só a porta exposta pra fora muda). Antes de mudar a porta de
novo, confira estas 4 coisas — **na ordem**, porque se o erro persistir após
trocar a porta, o problema provavelmente não é a porta:

1. **O container está de pé na porta certa?**
   ```bash
   docker compose ps
   ```
2. **Sobrou volume de uma tentativa anterior?** (o Postgres só aplica usuário/
   senha na *primeira* inicialização do volume — se reaproveitar um volume
   velho, a senha antiga continua valendo mesmo com compose novo)
   ```bash
   docker volume ls
   ```
3. **O `.env` realmente tem a porta nova?**
   ```bash
   # Windows (PowerShell)
   type .env
   # mac/linux
   cat .env
   ```
4. **Existe uma variável de ambiente `DATABASE_URL` no sistema sobrescrevendo
   o `.env`?** (isso tem prioridade sobre o arquivo e é uma causa comum e
   silenciosa)
   ```bash
   # Windows (PowerShell)
   $env:DATABASE_URL
   # mac/linux
   echo $DATABASE_URL
   ```

Se o item 2 mostrar um volume antigo, recrie do zero (projeto novo, sem dado
de valor):
```bash
docker compose down -v
docker compose up -d
```
Se o item 4 imprimir alguma coisa, é isso: remova a variável de ambiente do
sistema (ou do perfil do PowerShell) e rode de novo — o `.env` só vale se não
houver uma variável de ambiente com o mesmo nome já definida.

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
