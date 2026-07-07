"""Popula os agentes iniciais e os relacionamentos-base.

Idempotente: pode rodar quantas vezes quiser (ON CONFLICT DO NOTHING).
Uso (a partir da pasta backend/):  python -m scripts.seed
"""
import itertools
import json

from app.db.connection import connect

# Agentes iniciais. O chefe é você (tipo='chefe'); os demais são colaboradores.
# `mesa` é só a posição no escritório 2D. `personalidade` é o prompt-base
# (placeholder curto por enquanto — a versão real fica em app/agents/prompts/).
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
]


def main() -> None:
    conn = connect()
    conn.autocommit = True
    try:
        ids: dict[str, int] = {}
        with conn.cursor() as cur:
            for a in AGENTES:
                cur.execute(
                    """
                    INSERT INTO agentes
                        (nome, tipo, especialidade, personalidade, avatar_config, mesa)
                    VALUES (%s, %s, %s, %s, %s::jsonb, %s)
                    ON CONFLICT (nome) DO UPDATE SET
                        especialidade = EXCLUDED.especialidade,
                        personalidade = EXCLUDED.personalidade,
                        avatar_config = EXCLUDED.avatar_config,
                        mesa          = EXCLUDED.mesa
                    RETURNING id, nome
                    """,
                    (
                        a["nome"],
                        a["tipo"],
                        a["especialidade"],
                        a["personalidade"],
                        json.dumps(a["avatar_config"]),
                        a["mesa"],
                    ),
                )
                row = cur.fetchone()
                ids[row["nome"]] = row["id"]
                print(f"  agente ok: {row['nome']} (id={row['id']})")

            # Relacionamento-base: todo par ORDENADO de agentes começa neutro.
            # Cada agente guarda a própria visão do outro (inclusive do chefe).
            for origem, destino in itertools.permutations(ids.values(), 2):
                cur.execute(
                    """
                    INSERT INTO relacionamentos (agente_id, alvo_agente_id)
                    VALUES (%s, %s)
                    ON CONFLICT (agente_id, alvo_agente_id) DO NOTHING
                    """,
                    (origem, destino),
                )
        print("Seed OK.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
