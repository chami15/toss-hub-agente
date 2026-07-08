"""Detecção de gastos recorrentes — assinaturas e parcelas.

Lógica pura: recebe transações de saída já buscadas do banco, sem fazer
query nem chamar LLM. Mesma disciplina do modelo estatístico do soccer_magic
(cálculo determinístico, o agente só narra o resultado).

Duas categorias:
- "parcela": tem fim, extraído via regex de padrão "N/M" na descrição
  (ex: "PARC 03/12"). Projeta no próximo mês só se ainda não terminou.
- "assinatura": recorrência indefinida, detectada por agrupamento (mesma
  descrição normalizada + mesmo valor aparecendo em >= 2 meses distintos).
  Projeta sempre no próximo mês.

Limitação honesta: com pouco histórico (1 mês), a detecção de assinatura
não tem sinal suficiente — o retorno fica vazio ou parcial até acumular
2-3 meses de extrato, não é bug, é esperado.
"""
import re
from collections import defaultdict

_PARC_COM_PREFIXO = re.compile(r"PARC(?:ELA)?\.?\s*(\d{1,2})\s*/\s*(\d{1,2})", re.IGNORECASE)
_PARC_GENERICO = re.compile(r"\b(\d{1,2})\s*/\s*(\d{1,2})\b")


def extrair_parcela(descricao: str) -> tuple[int, int] | None:
    """Tenta extrair (parcela_atual, parcela_total) da descrição.

    Prioriza o padrão com prefixo "PARC"/"PARCELA" (confiável). Sem prefixo,
    só aceita se o total for > 12 — abaixo disso o padrão N/M é ambíguo
    demais com uma data (ex: "05/06") pra confiar sem contexto.
    """
    m = _PARC_COM_PREFIXO.search(descricao)
    if m:
        atual, total = int(m.group(1)), int(m.group(2))
        if 0 < atual <= total:
            return atual, total

    m = _PARC_GENERICO.search(descricao)
    if m:
        atual, total = int(m.group(1)), int(m.group(2))
        if total > 12 and 0 < atual <= total:
            return atual, total

    return None


def _chave_agrupamento(descricao: str) -> str:
    """Normaliza pra agrupar a mesma cobrança apesar de pequenas variações
    (número de referência que muda mês a mês, por exemplo)."""
    sem_digitos = re.sub(r"\d+", "", descricao.upper())
    return re.sub(r"\s+", " ", sem_digitos).strip()[:30]


def _chave_parcela(descricao_bruta: str) -> str:
    """Remove o "N/M" da descrição pra agrupar a MESMA parcela ao longo dos
    meses (ex: "PARC 04/12" e "PARC 05/12" do mesmo empréstimo) — sem isso,
    a mesma compra apareceria uma vez por mês presente no histórico e o
    gasto previsto contaria ela em dobro/triplo."""
    sem_parcela = _PARC_COM_PREFIXO.sub("", descricao_bruta)
    sem_parcela = _PARC_GENERICO.sub("", sem_parcela)
    sem_digitos = re.sub(r"\d+", "", sem_parcela.upper())
    return re.sub(r"\s+", " ", sem_digitos).strip()


def detectar_recorrencias(transacoes: list[dict]) -> list[dict]:
    """
    `transacoes`: saídas já buscadas do banco (idealmente >= 2-3 meses de
    histórico), cada dict com pelo menos: id, data (date), valor,
    descricao_bruta, descricao_normalizada.

    Retorna uma lista de recorrências já classificadas, pronta pra virar o
    KPI de "gasto previsto" (soma de quem tem `projeta_proximo_mes: True`)
    e pra alimentar os padrões do relatório.
    """
    parcelas: list[dict] = []
    candidatos_assinatura: dict[tuple[str, float], list[dict]] = defaultdict(list)

    for t in transacoes:
        descricao = t.get("descricao_normalizada") or t["descricao_bruta"]
        parcela = extrair_parcela(t["descricao_bruta"])
        if parcela:
            atual, total = parcela
            parcelas.append({**t, "parcela_atual": atual, "parcela_total": total})
            continue

        chave = _chave_agrupamento(descricao)
        candidatos_assinatura[(chave, round(float(t["valor"]), 2))].append(t)

    recorrencias = []

    # Dedup por parcela: a mesma compra aparece uma vez por mês presente no
    # histórico (04/12, depois 05/12, ...) — mantém só a ocorrência com o
    # maior parcela_atual (a mais recente), senão contaria em dobro.
    parcelas_por_chave: dict[tuple[str, int, float], dict] = {}
    for p in parcelas:
        chave = (_chave_parcela(p["descricao_bruta"]), p["parcela_total"], round(float(p["valor"]), 2))
        atual_melhor = parcelas_por_chave.get(chave)
        if atual_melhor is None or p["parcela_atual"] > atual_melhor["parcela_atual"]:
            parcelas_por_chave[chave] = p

    for p in parcelas_por_chave.values():
        restantes = max(p["parcela_total"] - p["parcela_atual"], 0)
        recorrencias.append(
            {
                "transacao_id": p["id"],
                "descricao": p.get("descricao_normalizada") or p["descricao_bruta"],
                "tipo": "parcela",
                "valor": float(p["valor"]),
                "parcela_atual": p["parcela_atual"],
                "parcela_total": p["parcela_total"],
                "parcelas_restantes": restantes,
                "projeta_proximo_mes": restantes > 0,
            }
        )

    for (chave, valor), ocorrencias in candidatos_assinatura.items():
        meses_distintos = {(o["data"].year, o["data"].month) for o in ocorrencias}
        if len(meses_distintos) < 2:
            continue
        mais_recente = max(ocorrencias, key=lambda o: o["data"])
        recorrencias.append(
            {
                "transacao_id": mais_recente["id"],
                "descricao": mais_recente.get("descricao_normalizada") or mais_recente["descricao_bruta"],
                "tipo": "assinatura",
                "valor": float(valor),
                "frequencia": "mensal",
                "ocorrencias_no_historico": len(meses_distintos),
                "projeta_proximo_mes": True,
            }
        )

    return recorrencias


def somar_gasto_previsto(recorrencias: list[dict]) -> float:
    """Soma o valor de tudo que deve se repetir no próximo mês."""
    return round(sum(r["valor"] for r in recorrencias if r.get("projeta_proximo_mes")), 2)
