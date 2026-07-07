"""Configuração central do backend.

Tudo vem do .env (ou de variáveis de ambiente). Nada de segredo hardcoded.
Um único objeto `settings` é importado pelo resto do código.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Banco
    database_url: str = "postgresql://hub:hub@localhost:5432/hub_agentes"

    # LLM (OpenAI) — modelos trocáveis por .env
    openai_api_key: str = ""
    llm_model_cheap: str = "gpt-4o-mini"
    llm_model_strong: str = "gpt-4o"

    # Motor de tick
    tick_intervalo_min: int = 15
    tick_minutos_simulados: int = 60

    # Controle de custo
    orcamento_diario_usd: float = 1.0

    # Contexto
    contexto_max_tokens: int = 2000


settings = Settings()
