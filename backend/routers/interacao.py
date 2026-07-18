"""HTTP fino da camada social do motor de tick — Etapa 2. Processa, pra
o tick atual, a rodada de interação social entre os colaboradores
ativos (quem quer falar, com quem, e a mensagem gerada), sempre
disparado manualmente e sempre depois de `POST /tick/avancar`.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from resolvers import interacao as resolver

router = APIRouter(prefix="/interacao", tags=["interacao"])


class EventoMundoInput(BaseModel):
    descricao: str = Field(..., min_length=1)


@router.post("/social/processar")
async def processar_interacao_social(
    dry_run: bool = Query(
        False, description="Calcula quem falaria e com quem, sem gerar mensagem nem persistir nada."
    ),
):
    try:
        return await resolver.processar_interacao_social(dry_run=dry_run)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.get("/eventos-mundo")
def listar_eventos_mundo():
    return resolver.listar_eventos_mundo()


@router.post("/eventos-mundo")
def criar_evento_mundo(corpo: EventoMundoInput):
    return resolver.criar_evento_mundo(corpo.descricao)
