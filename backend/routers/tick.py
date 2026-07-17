"""HTTP fino do motor de tick — Etapa 1 (fundação): só o relógio, sem
comportamento de agente ainda. Disparo sempre manual (você chama quando
quiser "avançar o tempo"), nunca automático nessa versão.
"""
from fastapi import APIRouter, Query

from resolvers import tick as resolver

router = APIRouter(prefix="/tick", tags=["tick"])


@router.post("/avancar")
def avancar_tick(
    dry_run: bool = Query(False, description="Calcula sem persistir — conferir sem gastar/gravar de verdade."),
):
    return resolver.avancar_tick(dry_run=dry_run)


@router.get("/atual")
def obter_tick_atual():
    tick = resolver.obter_tick_atual()
    if tick is None:
        return {"numero": 0, "hora_simulada": None, "mensagem": "Nenhum tick rodou ainda."}
    return tick


@router.get("/orcamento")
def obter_orcamento_do_dia():
    return {
        "gasto_hoje": round(resolver.orcamento_gasto_hoje(), 6),
        "disponivel_hoje": round(resolver.orcamento_disponivel_hoje(), 6),
    }
