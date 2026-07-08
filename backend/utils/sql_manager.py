"""Carrega e cacheia as queries SQL de sql/<arquivo>.sql.

Convenção: cada arquivo pode ter várias queries nomeadas via marcador
`--QUERY: nome`. Sem marcador, o arquivo inteiro é uma query só.
"""
import os
import re


class SQLManager:
    def __init__(self):
        current_dir = os.path.dirname(__file__)
        parent_dir = os.path.dirname(current_dir)
        self.queries_dir = os.path.join(parent_dir, "sql")
        self.queries_cache = {}

    def load_query(self, query_key: str, **variables) -> str:
        if query_key in self.queries_cache:
            query_template = self.queries_cache[query_key]
        else:
            query_template = self.load_query_from_file(query_key)
            self.queries_cache[query_key] = query_template

        if variables:
            try:
                return query_template.format(**variables)
            except KeyError as e:
                raise ValueError(f"Variável {e} não encontrada na query {query_key}")

        return query_template

    def load_query_from_file(self, query_key: str) -> str:
        if ":" in query_key:
            filename, query_name = query_key.split(":", 1)
            filename = f"{filename}.sql"
        else:
            filename = f"{query_key}.sql"
            query_name = None

        file_path = os.path.join(self.queries_dir, filename)

        try:
            with open(file_path, "r", encoding="utf-8") as file:
                content = file.read()

            if query_name:
                pattern = rf"--QUERY:\s*{re.escape(query_name)}\s*\n(.*?)(?=--QUERY:|$)"
                match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)

                if match:
                    query = match.group(1).strip()
                else:
                    raise ValueError(f"Query '{query_name}' não foi encontrada em {filename}")
            else:
                query = content.strip()

            return query

        except FileNotFoundError:
            raise FileNotFoundError(f"Arquivo SQL não encontrado: {file_path}")


sql_manager = SQLManager()
