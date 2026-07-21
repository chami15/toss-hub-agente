"""HTTP fino do motor de interação — Etapas 2 (social) e 3
(proatividade de trabalho) do motor de tick. Processa, pra o tick
atual, a rodada completa por colaborador ativo (trabalho tem
prioridade sobre social — ver `resolvers/interacao.py`), sempre
disparado manualmente e sempre depois de `POST /tick/avancar`.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from resolvers import interacao as resolver

router = APIRouter(prefix="/interacao", tags=["interacao"])


class EventoMundoInput(BaseModel):
    descricao: str = Field(..., min_length=1)


@router.post("/tick/processar")
async def processar_tick_completo(
    dry_run: bool = Query(
        False, description="Calcula quem trabalharia/falaria e com quem, sem executar ação nem persistir nada."
    ),
):
    try:
        return await resolver.processar_tick_completo(dry_run=dry_run)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.get("/eventos-mundo")
def listar_eventos_mundo():
    return resolver.listar_eventos_mundo()


@router.post("/eventos-mundo")
def criar_evento_mundo(corpo: EventoMundoInput):
    return resolver.criar_evento_mundo(corpo.descricao)
