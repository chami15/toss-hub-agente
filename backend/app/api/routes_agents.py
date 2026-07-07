"""Rotas de leitura dos agentes — é daqui que o front 2D lê o escritório.

Retorna cada agente com o que o front precisa pra desenhar a bolinha:
nome, especialidade, estado (idle/pensando/falando/executando), mesa e avatar.
"""
import psycopg
from fastapi import APIRouter, Depends

from app.db.connection import get_db

router = APIRouter(prefix="/agentes", tags=["agentes"])


@router.get("")
def listar_agentes(conn: psycopg.Connection = Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, nome, tipo, especialidade, estado, mesa, avatar_config, ativo
            FROM agentes
            ORDER BY mesa NULLS LAST, id
            """
        )
        return cur.fetchall()
