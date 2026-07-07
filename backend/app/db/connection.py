"""Conexão com o Postgres — simples e sem mágica.

`connect()` abre uma conexão nova (usada por scripts).
`get_db()` é a dependência do FastAPI: uma conexão por request, fechada no fim.

Usamos `dict_row` para que todo SELECT volte como dict (coluna -> valor),
mais legível do que tuplas posicionais.
"""
from collections.abc import Iterator

import psycopg
from psycopg.rows import dict_row

from app.config import settings


def connect() -> psycopg.Connection:
    """Abre uma conexão nova. Quem chama é responsável por fechar."""
    return psycopg.connect(settings.database_url, row_factory=dict_row)


def get_db() -> Iterator[psycopg.Connection]:
    """Dependência FastAPI: entrega uma conexão e fecha ao terminar o request."""
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()
