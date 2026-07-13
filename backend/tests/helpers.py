"""Helpers reutilizáveis pelos testes de qualquer agente — simula o
formato que `with_structured_output(..., include_raw=True)` devolve, sem
precisar chamar a OpenAI de verdade."""


class FakeRaw:
    def __init__(self, tokens_in: int = 10, tokens_out: int = 5):
        self.usage_metadata = {"input_tokens": tokens_in, "output_tokens": tokens_out}


def resultado_llm(dado, tokens_in: int = 10, tokens_out: int = 5) -> dict:
    """Formato CRU que `modelo.ainvoke(...)` devolve com `include_raw=True`
    — use só quando o teste mocka o MODELO em si (ex: `_get_model_scan`),
    deixando `_extrair_resultado` do agente rodar de verdade por cima."""
    return {"parsed": dado, "raw": FakeRaw(tokens_in, tokens_out), "parsing_error": None}


def resultado_llm_com_erro(erro: str) -> dict:
    return {"parsed": None, "raw": FakeRaw(), "parsing_error": erro}


def resultado_agente(dado, modelo: str = "gpt-4o-mini", tokens_in: int = 10, tokens_out: int = 5, custo_usd: float = 0.0001) -> dict:
    """Formato JÁ PROCESSADO que as funções de `agents/<dominio>/agente.py`
    devolvem depois de `_extrair_resultado` — use isso (o caso mais comum)
    quando o teste mocka a função do agente INTEIRA (ex:
    `resolvers.saude.agente_saude.estimar_macros_texto`), não o modelo por
    dentro dela."""
    return {"dado": dado, "modelo": modelo, "tokens_in": tokens_in, "tokens_out": tokens_out, "custo_usd": custo_usd}
