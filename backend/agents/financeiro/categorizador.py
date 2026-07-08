"""Categorização por palavra-chave — determinística, sem custo de LLM.

Transação sem match cai em "Outros". Se isso acontecer demais na prática,
dá pra evoluir pra um fallback via LLM em lote (1 chamada por importação,
nunca por transação) sem mudar a assinatura desta função.
"""

_REGRAS: dict[str, list[str]] = {
    "Alimentação": ["ifood", "rappi", "mercado", "supermercado", "restaurante", "padaria", "lanchonete"],
    "Transporte": ["uber", "99app", "posto ", "combustivel", "combustível", "estacionamento"],
    "Assinaturas": ["netflix", "spotify", "amazon prime", "icloud", "youtube premium", "disney"],
    "Saúde": ["farmacia", "farmácia", "drogaria", "hospital", "clinica", "clínica"],
    "Moradia": ["aluguel", "condominio", "condomínio", "energia", "sabesp", "internet"],
    "Lazer": ["cinema", "ingresso", "bar ", "balada", "show "],
}


def categorizar(descricao_normalizada: str) -> str:
    texto = descricao_normalizada.lower()
    for categoria, palavras_chave in _REGRAS.items():
        if any(p in texto for p in palavras_chave):
            return categoria
    return "Outros"
