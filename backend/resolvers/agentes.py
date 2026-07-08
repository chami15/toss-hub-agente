from utils.query_executor import executar_query


def listar_agentes() -> list[dict]:
    return executar_query("agentes:listar")
