"""Único ponto de entrada para rodar queries — todo o resto do app passa por aqui.

params    -> tupla de valores para os placeholders %s (seguro contra SQL injection)
kwargs    -> variáveis {var} interpoladas no template (só para identificadores
             internos e confiáveis, nunca para dado vindo de fora)
returning -> faz commit e retorna as linhas do RETURNING (INSERT/UPDATE/DELETE)
commit    -> faz commit e retorna o número de linhas afetadas (sem RETURNING)
"""
import psycopg

from utils.db import Database
from utils.sql_manager import sql_manager


def executar_query(
    query_name: str,
    commit: bool = False,
    returning: bool = False,
    params=None,
    **kwargs,
):
    query_sql = sql_manager.load_query(query_name, **kwargs)

    # uma retentativa com conexão nova: uma conexão ociosa do pool pode cair
    # (timeout do lado do servidor) entre uma query e outra.
    for tentativa in range(2):
        try:
            with Database() as conn:
                conn.execute(query_sql, params)

                if returning:
                    rows = conn.fetchall()
                    conn.commit()
                    return rows

                if commit:
                    linhas_afetadas = conn.get_cur().rowcount
                    conn.commit()
                    return linhas_afetadas

                return conn.fetchall()
        except (psycopg.OperationalError, psycopg.InterfaceError):
            if tentativa == 1:
                raise
