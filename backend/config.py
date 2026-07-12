"""Configuração central do backend.

Tudo vem do .env (ou de variáveis de ambiente). Nada de segredo hardcoded.
Um único objeto `settings` é importado pelo resto do código.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Banco
    database_url: str = "postgresql://hub:hub@localhost:5000/hub_agentes"

    # LLM (OpenAI) — modelos trocáveis por .env
    openai_api_key: str = ""
    llm_model_cheap: str = "gpt-4o-mini"
    llm_model_strong: str = "gpt-4o"

    # Motor de tick
    tick_intervalo_min: int = 15
    tick_minutos_simulados: int = 60

    # Controle de custo
    orcamento_diario_usd: float = 1.0

    # Preço por 1K tokens (USD) do modelo forte, usado só pra estimar
    # custo_usd nos registros de execução. CONFERIR na página de pricing
    # da OpenAI antes de confiar nesse número — pode estar desatualizado.
    preco_input_por_1k_forte: float = 0.0025
    preco_output_por_1k_forte: float = 0.01

    # Idem, pro modelo barato (usado na estimativa de macro de refeição do
    # agente de Saúde — não precisa do modelo forte pra isso). CONFERIR
    # também antes de confiar.
    preco_input_por_1k_barato: float = 0.00015
    preco_output_por_1k_barato: float = 0.0006

    # Contexto
    contexto_max_tokens: int = 2000

    # Google Calendar — credentials.json baixado do Cloud Console,
    # token.json gerado na primeira autorização (nenhum dos dois vai pro
    # git). "primary" é o calendário principal da conta autorizada.
    google_credentials_path: str = "credentials.json"
    google_token_path: str = "token.json"
    google_calendar_id: str = "primary"
    timezone_padrao: str = "America/Sao_Paulo"

    # Pendência aberta (ex: "qual dia?") mais velha que isso vira expirada
    # sozinha — sem isso, uma pergunta esquecida vira uma armadilha de
    # contexto pra qualquer mensagem nova e não-relacionada que vier depois.
    agenda_pendencia_ttl_minutos: int = 15

    # GitHub (agente Norte) — OAuth App com Device Flow habilitado (só
    # precisa de client_id, device flow não usa client_secret). Token
    # gerado uma vez por scripts/autorizar_github.py, nunca vai pro git.
    github_client_id: str = ""
    github_token_path: str = "github_token.json"
    github_oauth_scope: str = "repo"


settings = Settings()
