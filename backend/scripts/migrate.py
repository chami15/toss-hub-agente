"""Runner de migrations — aplica os .sql de app/db/migrations em ordem.

Idempotente: registra o que já rodou em `schema_migrations` e pula o resto.
Uso (a partir da pasta backend/):  python -m scripts.migrate
"""
import pathlib

import psycopg

from app.config import settings

MIGRATIONS_DIR = (
    pathlib.Path(__file__).resolve().parent.parent / "app" / "db" / "migrations"
)


def main() -> None:
    conn = psycopg.connect(settings.database_url)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    arquivo     TEXT PRIMARY KEY,
                    aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
            cur.execute("SELECT arquivo FROM schema_migrations")
            aplicadas = {r[0] for r in cur.fetchall()}

        arquivos = sorted(MIGRATIONS_DIR.glob("*.sql"))
        if not arquivos:
            print("Nenhuma migration encontrada.")
            return

        for arq in arquivos:
            if arq.name in aplicadas:
                print(f"=  já aplicada: {arq.name}")
                continue
            print(f"+  aplicando:   {arq.name}")
            sql = arq.read_text(encoding="utf-8")
            with conn.cursor() as cur:
                cur.execute(sql)
                cur.execute(
                    "INSERT INTO schema_migrations (arquivo) VALUES (%s)", (arq.name,)
                )
        print("Migrations OK.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
