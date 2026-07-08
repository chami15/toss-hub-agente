from utils.query_executor import executar_query


def listar_mensagens(tipo: str | None, limite: int) -> list[dict]:
    if tipo:
        return executar_query("mensagens:listar_por_tipo", params=(tipo, limite))
    return executar_query("mensagens:listar_todas", params=(limite,))
