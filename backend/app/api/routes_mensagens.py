"""Rotas de leitura das mensagens — histórico dos canais trabalho e copa.

Filtra por `tipo` (trabalho/social) para nunca misturar os dois contextos.
"""
from typing import Literal

import psycopg
from fastapi import APIRouter, Depends, Query

from app.db.connection import get_db

router = APIRouter(prefix="/mensagens", tags=["mensagens"])


@router.get("")
def listar_mensagens(
    tipo: Literal["trabalho", "social"] | None = Query(
        default=None, description="Filtra o canal. Vazio = todos."
    ),
    limite: int = Query(default=50, ge=1, le=500),
    conn: psycopg.Connection = Depends(get_db),
):
    where = "WHERE m.tipo = %s" if tipo else ""
    params: tuple = (tipo, limite) if tipo else (limite,)
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT m.id, m.tipo, m.conteudo, m.tick, m.criado_em,
                   m.remetente_id, r.nome AS remetente_nome,
                   m.destinatario_id, d.nome AS destinatario_nome
            FROM mensagens m
            JOIN agentes r ON r.id = m.remetente_id
            LEFT JOIN agentes d ON d.id = m.destinatario_id
            {where}
            ORDER BY m.id DESC
            LIMIT %s
            """,
            params,
        )
        return cur.fetchall()
