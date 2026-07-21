"""Camada social do motor de tick — Etapa 2 (ver conversa de design do
módulo de interação). Toda a decisão de QUEM tenta puxar assunto, COM
QUEM fala e SE existe orçamento pra isso é resolvida de forma
determinística (aritmética pura, sem custo) ANTES de qualquer chamada
de LLM — mesma disciplina "check before you spend" do resto do hub.

Fluxo por rodada (chamada manual, sempre depois de `tick/avancar`):
1. Checa orçamento diário disponível — zero, encerra sem gastar nada.
2. Pra cada colaborador ativo, sorteia (ponderado por extroversão +
   tempo parado) se ele tenta puxar papo social nesse tick.
3. Quem tenta, sorteia (ponderado pela afinidade, nunca 100% garantido)
   com quem fala, excluindo pares que já bateram o rate-limit do dia.
4. Só então gera a mensagem via LLM, persiste, atualiza afinidade dos
   dois lados e o estado do agente.

`dry_run=True` calcula tudo (quem falaria, com quem) sem gerar mensagem
nem persistir nada — mesmo espírito do dry_run da Etapa 1.
"""
import random
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from agents.interacao import agente as agente_interacao
from config import settings
from resolvers import tick as resolver_tick
from utils.query_executor import executar_query

_ESTADO_FALANDO = "falando"

_DIAS_SEMANA = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]


def _inicio_do_dia_real() -> datetime:
    hoje = datetime.now(ZoneInfo(settings.timezone_padrao)).date()
    return datetime.combine(hoje, datetime.min.time(), tzinfo=ZoneInfo(settings.timezone_padrao))


def _periodo_do_dia(hora: int) -> str:
    if hora < 6:
        return "madrugada"
    if hora < 12:
        return "manhã"
    if hora < 18:
        return "tarde"
    return "noite"


def _fato_do_dia(hora_simulada: datetime) -> str:
    """Derivado do relógio SIMULADO (`ticks.hora_simulada`), não da data
    real — garante consistência entre agentes no mesmo tick (é sempre o
    mesmo valor calculado, nunca sorteado) sem depender de nenhuma
    entrada de calendário no pool de `eventos_mundo` (achado testando de
    verdade: um tick podia sortear "sextou" e outro "segunda-feira" no
    mesmo dia real — ver docs/backlog-futuro.md pro calendário fictício
    completo, adiado pra próxima sprint)."""
    dia_semana = _DIAS_SEMANA[hora_simulada.weekday()]
    fim_de_semana = " (fim de semana)" if hora_simulada.weekday() >= 5 else ""
    periodo = _periodo_do_dia(hora_simulada.hour)
    return f"No escritório, hoje é {dia_semana}{fim_de_semana}, período da {periodo}."


def _chance_falar(extroversao: int, ticks_parado: int) -> float:
    chance = (
        (extroversao / 10) * settings.interacao_peso_extroversao
        + ticks_parado * settings.interacao_incremento_cooldown
    )
    return min(settings.interacao_chance_falar_max, max(0.0, chance))


def _peso_destinatario(afinidade: int) -> float:
    peso = 1 + (afinidade / 100) * settings.interacao_peso_afinidade_max
    return max(settings.interacao_peso_minimo, peso)


def _delta_afinidade(afinidade_atual: int) -> float:
    return settings.interacao_afinidade_incremento_max * (1 - afinidade_atual / 100)


def _ticks_parado(agente_id: int, numero_tick: int) -> int:
    rows = executar_query("mensagens:ultimo_tick_social_do_agente", params=(agente_id,))
    if not rows:
        return numero_tick
    return max(0, numero_tick - rows[0]["tick"])


def _par_disponivel(agente_a_id: int, agente_b_id: int) -> bool:
    inicio = _inicio_do_dia_real()
    rows = executar_query(
        "mensagens:contar_sociais_do_par_hoje",
        params=(agente_a_id, agente_b_id, agente_b_id, agente_a_id, inicio),
    )
    return rows[0]["total"] < settings.interacao_rate_limit_par_por_dia


def _escolher_destinatario(agente_id: int, colaboradores: list[dict]) -> dict | None:
    afinidades = {
        r["alvo_agente_id"]: r["afinidade"]
        for r in executar_query("relacionamentos:listar_afinidades_de", params=(agente_id,))
    }
    elegiveis = [c for c in colaboradores if c["id"] != agente_id and _par_disponivel(agente_id, c["id"])]
    if not elegiveis:
        return None
    pesos = [_peso_destinatario(afinidades.get(c["id"], 0)) for c in elegiveis]
    return random.choices(elegiveis, weights=pesos, k=1)[0]


def _sortear_evento_mundo() -> dict | None:
    rows = executar_query("eventos_mundo:sortear_menos_usado")
    return rows[0] if rows else None


def _historico_do_par(agente_a_id: int, agente_b_id: int) -> list[dict]:
    return executar_query(
        "mensagens:ultimas_do_par",
        params=(agente_a_id, agente_b_id, agente_b_id, agente_a_id, settings.interacao_historico_mensagens_par),
    )


def _atualizar_afinidade(agente_id: int, alvo_id: int) -> None:
    rows = executar_query("relacionamentos:buscar_por_par", params=(agente_id, alvo_id))
    afinidade_atual = rows[0]["afinidade"] if rows else 0
    nova = afinidade_atual + _delta_afinidade(afinidade_atual)
    nova = max(-100, min(100, round(nova)))
    executar_query("relacionamentos:atualizar_afinidade", commit=True, params=(nova, agente_id, alvo_id))


async def processar_interacao_social(dry_run: bool = False) -> dict:
    tick_atual = resolver_tick.obter_tick_atual()
    if tick_atual is None:
        raise ValueError(
            "Nenhum tick rodou ainda — avance o relógio (POST /tick/avancar) antes de processar interação social."
        )
    numero_tick = tick_atual["numero"]

    resultado = {"tick": numero_tick, "dry_run": dry_run, "interacoes": []}

    orcamento_disponivel = resolver_tick.orcamento_disponivel_hoje()
    resultado["orcamento_disponivel_hoje"] = round(orcamento_disponivel, 6)
    if orcamento_disponivel <= 0:
        resultado["aviso"] = "Orçamento diário esgotado — nenhuma interação social processada neste tick."
        return resultado

    colaboradores = executar_query("agentes:listar_colaboradores_ativos")
    if len(colaboradores) < 2:
        resultado["aviso"] = "Menos de 2 colaboradores ativos — não há com quem interagir socialmente."
        return resultado

    chefe_rows = executar_query("agentes:buscar_chefe")
    chefe = chefe_rows[0] if chefe_rows else None
    # O chefe é candidato a RECEBER papo social (deixa mais imersivo — um
    # "bom dia" ocasional, por exemplo), mas nunca ELEGE falar — ele não é
    # simulado, é o chefe de verdade. Por isso entra só no pool de
    # destinatários, nunca no loop de `colaboradores` que decide quem tenta.
    candidatos_destinatario = colaboradores + ([chefe] if chefe else [])

    evento = _sortear_evento_mundo()
    fato_do_dia = _fato_do_dia(tick_atual["hora_simulada"])

    for agente in colaboradores:
        ticks_parado = _ticks_parado(agente["id"], numero_tick)
        chance = _chance_falar(agente["extroversao"], ticks_parado)
        quer_falar = random.random() < chance

        entrada = {
            "agente_id": agente["id"],
            "agente_nome": agente["nome"],
            "chance_falar": round(chance, 4),
            "quer_falar": quer_falar,
            "destinatario_id": None,
            "destinatario_nome": None,
            "mensagem": None,
        }

        if quer_falar:
            destinatario = _escolher_destinatario(agente["id"], candidatos_destinatario)
            if destinatario is None:
                entrada["aviso"] = "Nenhum destinatário elegível (rate limit do dia atingido em todos os pares)."
            else:
                entrada["destinatario_id"] = destinatario["id"]
                entrada["destinatario_nome"] = destinatario["nome"]

                if not dry_run:
                    historico = _historico_do_par(agente["id"], destinatario["id"])
                    destinatario_eh_chefe = chefe is not None and destinatario["id"] == chefe["id"]
                    resposta = await agente_interacao.gerar_mensagem_social(
                        agente["personalidade"],
                        agente["nome"],
                        destinatario["nome"],
                        historico,
                        evento["descricao"] if evento else None,
                        fato_do_dia,
                        destinatario_eh_chefe,
                    )
                    conteudo = resposta["dado"].conteudo
                    executar_query(
                        "mensagens:inserir",
                        returning=True,
                        params=(agente["id"], destinatario["id"], "social", conteudo, numero_tick),
                    )
                    _atualizar_afinidade(agente["id"], destinatario["id"])
                    _atualizar_afinidade(destinatario["id"], agente["id"])
                    executar_query("agentes:atualizar_estado", commit=True, params=(_ESTADO_FALANDO, agente["id"]))
                    entrada["mensagem"] = conteudo

        resultado["interacoes"].append(entrada)

    if not dry_run and evento is not None and any(i["mensagem"] for i in resultado["interacoes"]):
        executar_query("eventos_mundo:marcar_usado", commit=True, params=(numero_tick, evento["id"]))

    return resultado


def listar_eventos_mundo() -> list[dict]:
    return executar_query("eventos_mundo:listar")


def criar_evento_mundo(descricao: str) -> dict:
    tick_atual = resolver_tick.obter_tick_atual()
    numero_tick = tick_atual["numero"] if tick_atual else None
    rows = executar_query("eventos_mundo:inserir", returning=True, params=(descricao, numero_tick))
    return rows[0]
