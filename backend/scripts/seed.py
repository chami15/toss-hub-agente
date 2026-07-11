"""Popula os agentes iniciais e os relacionamentos-base.

Idempotente: pode rodar quantas vezes quiser.
Uso (a partir da pasta backend/):  python -m scripts.seed
"""
import itertools
import json

from utils.query_executor import executar_query

# Agentes iniciais. O chefe é você (tipo='chefe'); os demais são colaboradores.
# `mesa` é só a posição no escritório 2D. `personalidade` é o prompt-base
# (placeholder curto por enquanto — a versão real fica em agents/<tipo>/).
AGENTES = [
    {
        "nome": "Você",
        "tipo": "chefe",
        "especialidade": "chefe",
        "personalidade": None,
        "avatar_config": {"cor": "#111827", "rosto": "🧑‍💼"},
        "mesa": 0,
    },
    {
        "nome": "Cifra",
        "tipo": "colaborador",
        "especialidade": "financeiro",
        "personalidade": (
            "Você é o agente Financeiro. Metódico, cauteloso e um pouco "
            "controlador. Cuida de gastos e orçamento. NUNCA move dinheiro de "
            "verdade sem confirmação explícita do chefe."
        ),
        "avatar_config": {"cor": "#16a34a", "rosto": "🤑"},
        "mesa": 1,
    },
    {
        "nome": "Agenda",
        "tipo": "colaborador",
        "especialidade": "agenda",
        "personalidade": (
            "Você é o agente de Agenda. Organizado, direto e ansioso com prazos. "
            "Cuida de compromissos e do calendário do chefe."
        ),
        "avatar_config": {"cor": "#2563eb", "rosto": "📅"},
        "mesa": 2,
    },
    {
        "nome": "Vita",
        "tipo": "colaborador",
        "especialidade": "saude",
        "personalidade": (
            "Você é o agente de Saúde. Direto, sem rodeio, nunca alarmista. "
            "Cuida de alimentação, peso, sono, hidratação e atividade física do chefe."
        ),
        "avatar_config": {"cor": "#f97316", "rosto": "💪"},
        "mesa": 3,
    },
]


def main() -> None:
    ids: dict[str, int] = {}

    for a in AGENTES:
        rows = executar_query(
            "agentes:upsert",
            returning=True,
            params=(
                a["nome"],
                a["tipo"],
                a["especialidade"],
                a["personalidade"],
                json.dumps(a["avatar_config"]),
                a["mesa"],
            ),
        )
        row = rows[0]
        ids[row["nome"]] = row["id"]
        print(f"  agente ok: {row['nome']} (id={row['id']})")

    # Relacionamento-base: todo par ORDENADO de agentes começa neutro.
    # Cada agente guarda a própria visão do outro (inclusive do chefe).
    for origem, destino in itertools.permutations(ids.values(), 2):
        executar_query(
            "relacionamentos:upsert_neutro",
            commit=True,
            params=(origem, destino),
        )

    print("Seed OK.")


if __name__ == "__main__":
    main()
