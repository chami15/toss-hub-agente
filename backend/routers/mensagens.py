from typing import Literal

from fastapi import APIRouter, Query

from resolvers import mensagens as resolver

router = APIRouter(prefix="/mensagens", tags=["mensagens"])


@router.get("")
def listar_mensagens(
    tipo: Literal["trabalho", "social"] | None = Query(
        default=None, description="Filtra o canal. Vazio = todos."
    ),
    limite: int = Query(default=50, ge=1, le=500),
):
    return resolver.listar_mensagens(tipo, limite)
