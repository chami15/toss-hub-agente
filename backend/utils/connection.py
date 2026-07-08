"""Pool de conexões com o Postgres (psycopg3).

Mesmo padrão de sempre (pool + wrapper com cursor pronto, devolve pro pool
no close()), adaptado do psycopg2 pro psycopg3: o pool aqui é o
`psycopg_pool.ConnectionPool` nativo, que já cuida de descartar conexão
quebrada e reconectar sozinho — não precisamos reimplementar isso.

Cursores usam `row_factory=dict_row`, então todo fetch já volta como
dict (coluna -> valor), sem precisar zipar com `cursor.description`.
"""
import threading

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from config import settings

_pool: ConnectionPool | None = None
_pool_lock = threading.Lock()


def _get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                _pool = ConnectionPool(
                    settings.database_url,
                    # autocommit evita deixar transação aberta em conexão
                    # devolvida ao pool após um SELECT (o pool teria que
                    # forçar rollback nela antes do próximo uso). Em
                    # autocommit, `conn.commit()` nos INSERT/UPDATE vira
                    # no-op seguro, então não muda a lógica de escrita.
                    kwargs={"row_factory": dict_row, "autocommit": True},
                    min_size=1,
                    max_size=10,
                    open=True,
                )
    return _pool


def close_pool() -> None:
    """Fecha o pool. Usar no shutdown da aplicação."""
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


class PostgreConn:
    """Uma conexão emprestada do pool, com cursor pronto para uso."""

    def __init__(self):
        self.pool = _get_pool()
        self.conn = self.pool.getconn()
        self.cur = self.conn.cursor()

    def close(self):
        if self.cur:
            self.cur.close()
        if self.conn:
            self.pool.putconn(self.conn)
        self.cur = None
        self.conn = None

    def commit(self):
        if self.conn:
            self.conn.commit()

    def rollback(self):
        if self.conn:
            self.conn.rollback()

    def execute(self, query, params=None):
        try:
            self.cur.execute(query, params)
        except Exception:
            self.rollback()
            raise

    def fetchall(self):
        return self.cur.fetchall() if self.cur else None

    def fetchone(self):
        return self.cur.fetchone() if self.cur else None

    def get_cur(self):
        return self.cur
