"""HTTP fino do domínio Norte: projetos (repositórios do GitHub) e cards
(sugestão de próximo passo, um por vez, por projeto).

Resolver um card (aceitar->finalizar, ou rejeitar) já devolve o PRÓXIMO
card na mesma resposta (`proximo_card`) — o frontend não precisa de um
botão separado de "gerar próximo", só o primeiro card de um projeto novo
precisa do endpoint `/cards/gerar` explícito.
"""
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from resolvers import norte as resolver

router = APIRouter(prefix="/norte", tags=["norte"])

_TipoCard = Literal["feature", "bug", "refatoracao", "proximo_passo"]


class ProjetoInput(BaseModel):
    nome: str
    repositorio_url: str


class StatusProjetoInput(BaseModel):
    status: Literal["ativo", "pausado", "concluido", "abandonado"]


class CardManualInput(BaseModel):
    tipo: _TipoCard
    titulo: str
    descricao: str
    arquivos_afetados: list[str] = Field(..., min_length=1)


@router.post("/projetos")
async def criar_projeto(corpo: ProjetoInput):
    try:
        return await resolver.criar_projeto(corpo.nome, corpo.repositorio_url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("/projetos")
def listar_projetos():
    return resolver.listar_projetos()


@router.get("/projetos/{projeto_id}")
def obter_projeto(projeto_id: int):
    try:
        return resolver.obter_projeto(projeto_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch("/projetos/{projeto_id}/status")
def atualizar_status_projeto(projeto_id: int, corpo: StatusProjetoInput):
    try:
        return resolver.atualizar_status_projeto(projeto_id, corpo.status)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/projetos/{projeto_id}/cards/ativo")
def obter_card_ativo(projeto_id: int):
    card = resolver.obter_card_ativo(projeto_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Nenhum card ativo pra esse projeto no momento.")
    return card


@router.get("/projetos/{projeto_id}/cards/historico")
def listar_historico_cards(projeto_id: int, limite: int = 10):
    return resolver.listar_historico_cards(projeto_id, limite)


@router.post("/projetos/{projeto_id}/cards/gerar")
async def gerar_proximo_card(projeto_id: int):
    try:
        return await resolver.gerar_proximo_card(projeto_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.post("/projetos/{projeto_id}/cards/manual")
def criar_card_manual(projeto_id: int, corpo: CardManualInput):
    try:
        return resolver.criar_card_manual(projeto_id, corpo.tipo, corpo.titulo, corpo.descricao, corpo.arquivos_afetados)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.post("/cards/{card_id}/aceitar")
def aceitar_card(card_id: int):
    try:
        return resolver.aceitar_card(card_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.post("/cards/{card_id}/rejeitar")
async def rejeitar_card(card_id: int):
    try:
        return await resolver.rejeitar_card(card_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.post("/cards/{card_id}/finalizar")
async def finalizar_card(card_id: int):
    try:
        return await resolver.finalizar_card(card_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
