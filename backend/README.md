# Backend — Hub de Agentes

Fundação (banco + schema + scripts + API de leitura) + dois agentes:
**Financeiro** (Cifra: upload de extrato Itaú/Nubank, dashboard ao vivo,
relatório mensal narrado por LLM) e **Agenda** (Google Calendar: consulta
direta sem LLM, negociação de horário guiada, criar/mover/cancelar evento
sempre com confirmação humana antes de executar). Ainda **sem** motor de
tick — isso é a próxima fatia.

## ⚠️ Antes de usar de verdade

**Financeiro**: os parsers de `agents/financeiro/parsers/` (Itaú em PDF,
Nubank em CSV) já foram validados contra extrato real de cada banco — mas
bancos mudam formato de tempos em tempos; se um upload falhar, o erro
aponta o motivo (coluna não encontrada, cabeçalho não achado). O relatório
mensal (`POST /financeiro/relatorio/gerar`) chama a OpenAI de verdade —
precisa de `OPENAI_API_KEY` válida no `.env`. Upload e dashboard não usam
LLM, funcionam sem chave.

**Agenda**: precisa de `credentials.json` (OAuth "Desktop app", escopo
`calendar.events`) na raiz do `backend/` — nunca comitar esse arquivo nem
o `token.json` gerado na primeira autorização (ambos no `.gitignore`). A
autorização (abre o navegador) só roda na sua máquina, não dá pra testar
num ambiente sem navegador. Nenhuma ação real (criar/mover/cancelar
evento) executa sem confirmação explícita — ver `acoes_pendentes`.

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
uvicorn main:app --reload
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

Camadas granulares por entidade — router (HTTP fino) nunca fala com o banco
direto, sempre passa pelo resolver; SQL nunca fica inline no Python, sempre
em arquivo versionado com queries nomeadas.

```
config.py                 # settings via .env (banco, LLM, tick, orçamento)
main.py                    # app FastAPI (monta os routers)

db/
  migrations/              # .sql versionados, aplicados em ordem (schema)

utils/                     # infraestrutura de acesso a dado
  connection.py            # pool psycopg3 (psycopg_pool.ConnectionPool)
  db.py                    # context manager `with Database() as conn:`
  sql_manager.py           # carrega/cacheia queries nomeadas de sql/*.sql
  query_executor.py        # executar_query() — único ponto de entrada no banco

sql/                       # SQL puro, nunca embutido no Python
  agentes.sql
  mensagens.sql
  relacionamentos.sql
  transacoes.sql
  extratos_importados.sql
  relatorios_financeiros.sql
  acoes_pendentes.sql

agents/                    # lógica dos agentes LLM, um domínio por pasta
  financeiro/
    agente.py               # chamada única estruturada (sem tool-loop, sem
                             # decisão a tomar: sempre os mesmos cálculos)
    categorizador.py         # categorização por regra, sem LLM
    recorrencias.py           # detecção de assinatura/parcela, lógica pura
    parsers/
      itau.py                # PDF Itaú -> formato interno (pdfplumber, posicional)
      nubank.py               # CSV Nubank -> formato interno
  agenda/
    google_calendar.py        # cliente OAuth + chamadas reais à API (determinístico)
    tools.py                   # tools de LEITURA do agente (listar/buscar)
    agente.py                   # create_agent com raciocínio (checa conflito,
                                # julga horário) — saída sempre estruturada,
                                # nunca escreve no calendário direto

resolvers/                 # regra de negócio (o router chama isso, nunca o banco)
  agentes.py
  mensagens.py
  financeiro.py             # importar extrato, calcular dashboard, gerar relatório
  agenda.py                  # roteador de intenção + negociação + gate de confirmação

routers/                   # HTTP fino — só parse de request/response
  agentes.py                # GET /agentes
  mensagens.py               # GET /mensagens
  financeiro.py               # POST /financeiro/extrato, GET /dashboard, /relatorio
  agenda.py                    # POST /agenda/mensagem, /agenda/acoes/{id}/confirmar|rejeitar

scripts/
  migrate.py                # aplica as migrations (idempotente)
  seed.py                    # cria agentes + relacionamentos-base, via executar_query

docker-compose.yml          # postgres + adminer
```

## Próxima fatia (a combinar)

Motor de tick (`resolvers/tick.py`) que percorre os agentes ativos e aplica
os efeitos, e mais agentes — definindo um de cada vez antes de codar, mesmo
processo que usamos pro Financeiro e pro Agenda.
