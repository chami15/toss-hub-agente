"""Categorização por palavra-chave — determinística, sem custo de LLM.

Transação sem match cai em "Outros". Este dicionário é pra crescer aos
poucos: conforme extratos reais forem chegando, novos merchants/keywords
entram aqui (ex: "anthropic"/"claude" -> Assinaturas). Se isso acontecer
demais na prática, dá pra evoluir pra um fallback via LLM em lote (1
chamada por importação, nunca por transação) sem mudar a assinatura desta
função.

Cuidado ao adicionar keyword curta/genérica: descrição de Pix inclui o
nome da instituição/gateway que recebeu (ex: "Pagseguro Internet"), que
pode colidir por acaso com uma keyword pensada pra outra coisa (já
aconteceu com "internet", pensada pra conta de internet residencial).
Prefira o nome específico do merchant/app, não uma palavra genérica.
"""

_REGRAS: dict[str, list[str]] = {
    "Alimentação": ["ifood", "rappi", "mercado", "supermercado", "restaurante", "padaria", "lanchonete"],
    "Transporte": ["uber", "99 tecnologia", "99app", "posto ", "combustivel", "combustível", "estacionamento"],
    "Assinaturas": [
        "netflix", "spotify", "amazon prime", "icloud", "youtube premium", "disney",
        "anthropic", "claude",
    ],
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
