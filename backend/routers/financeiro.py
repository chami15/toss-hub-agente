"""HTTP fino do domínio Financeiro: upload de extrato, dashboard (ao vivo) e
relatório mensal (narrativa persistida).

Upload nunca gera o relatório sozinho — é uma ação separada e deliberada
(POST /financeiro/relatorio/gerar), pra nunca disparar custo de LLM sem uma
decisão explícita.
"""
from datetime import date
from typing import Literal

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from resolvers import financeiro as resolver

router = APIRouter(prefix="/financeiro", tags=["financeiro"])


def _primeiro_dia_do_mes(mes: str) -> date:
    """`mes` no formato 'YYYY-MM'."""
    try:
        ano, numero_mes = mes.split("-")
        return date(int(ano), int(numero_mes), 1)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail="Parâmetro 'mes' precisa ser 'YYYY-MM'.")


@router.post("/extrato")
async def importar_extrato(
    banco: Literal["itau", "nubank"],
    arquivo: UploadFile = File(...),
):
    conteudo_bytes = await arquivo.read()
    conteudo = conteudo_bytes.decode("utf-8-sig")  # utf-8-sig cobre BOM comum em CSV exportado do Excel
    return resolver.importar_extrato(banco, arquivo.filename, conteudo)


@router.get("/dashboard")
def obter_dashboard(mes: str = Query(..., description="Mês no formato YYYY-MM")):
    return resolver.obter_dashboard(_primeiro_dia_do_mes(mes))


@router.get("/relatorio")
def obter_relatorio(mes: str = Query(..., description="Mês no formato YYYY-MM")):
    relatorio = resolver.obter_relatorio(_primeiro_dia_do_mes(mes))
    if relatorio is None:
        raise HTTPException(status_code=404, detail="Relatório ainda não gerado para esse mês.")
    return relatorio


@router.post("/relatorio/gerar")
async def gerar_relatorio(mes: str = Query(..., description="Mês no formato YYYY-MM")):
    return await resolver.gerar_relatorio(_primeiro_dia_do_mes(mes))
