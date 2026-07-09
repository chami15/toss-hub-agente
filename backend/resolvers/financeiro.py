"""Orquestra o domínio do Financeiro: importação de extrato, dashboard (dados
ao vivo) e relatório mensal (narrativa persistida).

Fluxo de importação: parser do banco -> hash de dedup -> insere em
transacoes -> registra o upload em extratos_importados -> categoriza as
saídas novas (regra determinística, sem LLM). Nunca dispara o LLM sozinho —
gerar o relatório é uma ação separada e deliberada (mesmo espírito do
tick --once/--dry-run: nunca gastar token sem uma ação explícita).
"""
import hashlib
import json
from datetime import date

from agents.financeiro import agente as agente_financeiro
from agents.financeiro.categorizador import categorizar
from agents.financeiro.parsers import itau as parser_itau
from agents.financeiro.parsers import nubank as parser_nubank
from agents.financeiro.recorrencias import detectar_recorrencias, somar_gasto_previsto
from utils.query_executor import executar_query

_PARSERS = {
    "itau": parser_itau.parse,
    "nubank": parser_nubank.parse,
}

_MESES_HISTORICO_RECORRENCIA = 6


def _hash_lancamento(banco: str, transacao, ordinal: int = 0) -> str:
    """Prefere o identificador único do próprio banco (ex: UUID do Nubank)
    quando o parser conseguiu extrair um — é mais confiável que
    data+valor+descrição, que duas transações reais e distintas podem ter
    idênticos (ex: dois Pix do mesmo valor, mesmo dia, pra mesma pessoa).

    O Nubank reaproveita o MESMO identificador para uma transação e o
    estorno dela (mesmo Pix, sinal invertido) — por isso o `tipo`
    (entrada/saida) também entra no hash, senão o estorno seria descartado
    como se fosse a mesma transação duplicada.

    Sem identificador (formato que não oferece um, ex: Itaú), cai no
    composto + `ordinal` (a Nª ocorrência daquela combinação exata dentro
    do mesmo arquivo) — sem isso, duas transações legitimamente iguais no
    mesmo dia (ex: duas tarifas idênticas) colidiriam e uma seria perdida.
    Reimportar o mesmo arquivo reproduz os mesmos ordinais na mesma ordem,
    então o dedup continua funcionando."""
    if transacao.identificador_banco:
        bruto = f"{banco}|id:{transacao.identificador_banco}|{transacao.tipo}"
    else:
        bruto = (
            f"{banco}|{transacao.data.isoformat()}|{transacao.valor}|"
            f"{transacao.descricao_bruta}|{ordinal}"
        )
    return hashlib.sha256(bruto.encode("utf-8")).hexdigest()


def importar_extrato(banco: str, nome_arquivo: str, conteudo: bytes) -> dict:
    if banco not in _PARSERS:
        raise ValueError(f"Banco não suportado: {banco}")

    transacoes = _PARSERS[banco](conteudo)
    if not transacoes:
        return {
            "total_no_arquivo": 0,
            "novas": 0,
            "duplicadas": 0,
            "periodo_inicio": None,
            "periodo_fim": None,
        }

    periodo_inicio = min(t.data for t in transacoes)
    periodo_fim = max(t.data for t in transacoes)

    extrato_rows = executar_query(
        "extratos_importados:inserir",
        returning=True,
        params=(banco, nome_arquivo, periodo_inicio, periodo_fim, len(transacoes)),
    )
    extrato_id = extrato_rows[0]["id"]

    novas = 0
    contador_repeticao: dict[tuple, int] = {}
    for t in transacoes:
        chave_composta = (t.data, t.valor, t.descricao_bruta)
        ordinal = contador_repeticao.get(chave_composta, 0)
        contador_repeticao[chave_composta] = ordinal + 1

        hash_lancamento = _hash_lancamento(banco, t, ordinal)
        inseridas = executar_query(
            "transacoes:inserir",
            returning=True,
            params=(
                banco,
                t.data,
                t.valor,
                t.tipo,
                t.descricao_bruta,
                t.descricao_normalizada,
                t.identificador_banco,
                hash_lancamento,
                extrato_id,
            ),
        )
        if not inseridas:
            continue  # já existia — dedup via ON CONFLICT DO NOTHING no hash

        novas += 1
        if t.tipo == "saida":
            categoria = categorizar(t.descricao_normalizada)
            executar_query(
                "transacoes:atualizar_categoria",
                commit=True,
                params=(categoria, inseridas[0]["id"]),
            )

    return {
        "total_no_arquivo": len(transacoes),
        "novas": novas,
        "duplicadas": len(transacoes) - novas,
        "periodo_inicio": periodo_inicio.isoformat(),
        "periodo_fim": periodo_fim.isoformat(),
    }


def _mes_menos(mes_referencia: date, meses: int) -> date:
    ano = mes_referencia.year
    mes = mes_referencia.month - meses
    while mes <= 0:
        mes += 12
        ano -= 1
    return date(ano, mes, 1)


def _calcular_dashboard(mes_referencia: date) -> dict:
    resumo = executar_query(
        "transacoes:resumo_mensal", params=(mes_referencia, mes_referencia)
    )[0]
    categorias = executar_query(
        "transacoes:por_categoria", params=(mes_referencia, mes_referencia)
    )
    evolucao = executar_query(
        "transacoes:evolucao_diaria", params=(mes_referencia, mes_referencia)
    )
    maiores = executar_query(
        "transacoes:maiores_gastos", params=(mes_referencia, mes_referencia, 5)
    )

    gasto_total = float(resumo["total_saidas"])
    ganho_total = float(resumo["total_entradas"])
    valor_categorias_total = sum(float(c["valor"]) for c in categorias) or 1  # evita div/0

    historico_inicio = _mes_menos(mes_referencia, _MESES_HISTORICO_RECORRENCIA)
    historico = executar_query(
        "transacoes:listar_saidas_historico", params=(historico_inicio,)
    )
    recorrencias = detectar_recorrencias(historico)
    gasto_previsto = somar_gasto_previsto(recorrencias)

    return {
        "kpis": {
            "gasto_mensal": gasto_total,
            "ganho_mensal": ganho_total,
            # TODO: precisa de suporte no parser pra extrair saldo de
            # fechamento do extrato — ainda não implementado (ver aviso
            # sobre validar os parsers com amostra real).
            "saldo_ultimo_extrato": None,
            "gasto_previsto_proximo_mes": gasto_previsto,
        },
        "graficos": {
            "entradas_saidas": {"entradas": ganho_total, "saidas": gasto_total},
            "gastos_por_categoria": [
                {
                    "categoria": c["categoria"],
                    "valor": float(c["valor"]),
                    "percentual": round(float(c["valor"]) / valor_categorias_total * 100, 1),
                }
                for c in categorias
            ],
            "evolucao_diaria": [
                {"dia": e["dia"], "valor": float(e["valor"])} for e in evolucao
            ],
        },
        "recorrencias_detectadas": recorrencias,
        "maiores_gastos": [
            {
                "descricao": m["descricao_normalizada"] or m["descricao_bruta"],
                "valor": float(m["valor"]),
                "data": m["data"].isoformat(),
                "categoria": m["categoria"],
            }
            for m in maiores
        ],
    }


def obter_dashboard(mes_referencia: date) -> dict:
    return _calcular_dashboard(mes_referencia)


def obter_relatorio(mes_referencia: date) -> dict | None:
    """Devolve só o conteúdo do relatório (a narrativa + dashboard congelados
    no momento da geração) — modelo/tokens/custo ficam só no banco, nunca
    saem pela API (não aparecem no frontend, por decisão de produto)."""
    rows = executar_query(
        "relatorios_financeiros:buscar_por_mes", params=(mes_referencia,)
    )
    return rows[0]["relatorio"] if rows else None


async def gerar_relatorio(mes_referencia: date) -> dict:
    """Calcula o dashboard, chama o agente só pra narrativa, e persiste o
    relatório completo. É uma ação deliberada — nunca disparada sozinha
    pelo upload.

    Custo/tokens/modelo ficam só como registro no banco (colunas próprias
    de `relatorios_financeiros`) — nunca voltam na resposta da API, por
    decisão de produto (não aparece no frontend)."""
    dashboard = _calcular_dashboard(mes_referencia)
    resultado_llm = await agente_financeiro.gerar_analise(dashboard)

    relatorio_completo = {
        "mes_referencia": mes_referencia.isoformat(),
        **dashboard,
        "analise": resultado_llm["analise"].model_dump(),
    }

    executar_query(
        "relatorios_financeiros:upsert",
        returning=True,
        params=(
            mes_referencia,
            json.dumps(relatorio_completo, default=str),
            resultado_llm["modelo"],
            resultado_llm["tokens_in"],
            resultado_llm["tokens_out"],
            resultado_llm["custo_usd"],
        ),
    )

    return relatorio_completo
