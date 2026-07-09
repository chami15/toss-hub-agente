"""Tools de leitura do agente Agenda — consulta o calendário real.

Só leitura, de propósito: toda proposta de ação (criar/mover/cancelar) é
a SAÍDA ESTRUTURADA do agente (ver agente.py), nunca uma tool com efeito
colateral. Isso mantém a escrita (acao_pendente) fora do loop de
raciocínio do LLM — só o resolver grava no banco, nunca o agente direto.
"""
from langchain.tools import tool
from pydantic import BaseModel, Field

from agents.agenda import google_calendar


class PeriodoInput(BaseModel):
    data_inicio_iso: str = Field(..., description="Início do período, ISO 8601 com timezone.")
    data_fim_iso: str = Field(..., description="Fim do período, ISO 8601 com timezone.")


class BuscaInput(BaseModel):
    termo: str = Field(..., description="Texto livre pra buscar no título/descrição/local do evento.")
    data_inicio_iso: str | None = Field(default=None, description="Filtro opcional de início do período.")
    data_fim_iso: str | None = Field(default=None, description="Filtro opcional de fim do período.")


@tool(args_schema=PeriodoInput)
def listar_eventos_periodo(data_inicio_iso: str, data_fim_iso: str) -> dict:
    """Lista os eventos já marcados num período. Use isso pra saber o que
    já está na agenda antes de sugerir um novo horário — nunca proponha
    um horário sem checar conflito primeiro."""
    try:
        eventos = google_calendar.listar_eventos(data_inicio_iso, data_fim_iso)
    except Exception as exc:
        return {"status": "erro", "detalhe": f"Falha ao listar eventos: {exc}"}
    return {"status": "ok", "eventos": google_calendar.resumir_eventos(eventos)}


@tool(args_schema=BuscaInput)
def buscar_eventos(termo: str, data_inicio_iso: str | None = None, data_fim_iso: str | None = None) -> dict:
    """Busca eventos por texto (título/descrição/local), com filtro de
    período opcional. Use pra achar um evento específico que o chefe
    mencionou (ex: "minha reunião de amanhã") antes de mover ou cancelar."""
    try:
        eventos = google_calendar.buscar_eventos(termo, data_inicio_iso, data_fim_iso)
    except Exception as exc:
        return {"status": "erro", "detalhe": f"Falha ao buscar eventos: {exc}"}
    return {"status": "ok", "eventos": google_calendar.resumir_eventos(eventos)}
