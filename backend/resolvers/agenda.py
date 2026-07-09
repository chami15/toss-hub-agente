"""Orquestra o domínio da Agenda: roteador de intenção + negociação de
horário + gate de confirmação antes de qualquer ação real no Google
Calendar.

Fluxo por mensagem recebida (ver processar_mensagem):
  1. Se já existe uma acao_pendente aberta pro agente Agenda:
     - "sim/confirma/ok" -> executa a ação real, fecha a pendência.
     - "não/cancela" -> fecha como rejeitada, chama o agente de novo com
       o contexto da rejeição, abre nova pendência.
     - qualquer outra resposta (ajuste, resposta a uma pergunta do
       agente) -> chama o agente de novo com o contexto acumulado.
  2. Sem pendência aberta:
     - consulta simples (buscar/listar/quais) -> responde direto, sem
       LLM, lendo o Calendar de verdade.
     - senão -> aciona o agente de negociação com a mensagem como pedido
       original.

Nenhuma ação real (criar/mover/cancelar) executa sem confirmação
explícita — mesmo espírito de todo o projeto (ver acoes_pendentes).

Confirmar/rejeitar aqui é específico do Agenda por enquanto (dispatch pra
google_calendar). Quando um segundo agente precisar do mesmo gate, essa
parte genérica (buscar pendente, checar status, marcar resolvido) vale a
pena extrair pra um resolver compartilhado — não fizemos isso agora
porque só tem um consumidor até aqui.
"""
import json
import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from agents.agenda import google_calendar
from agents.agenda.agente import decidir
from config import settings
from utils.query_executor import executar_query

_PADRAO_CONFIRMACAO = re.compile(r"^\s*(sim|confirma|confirmo|ok|blz|beleza|pode)\b", re.IGNORECASE)
_PADRAO_REJEICAO = re.compile(r"^\s*(n[aã]o|cancela|cancelar)\b", re.IGNORECASE)
_PADRAO_CONSULTA = re.compile(
    r"\b(o que (vou|tenho)|quais eventos|quais compromissos|listar|buscar|"
    r"tenho (algo|alguma coisa|compromisso))\b",
    re.IGNORECASE,
)


def _agente_id() -> int:
    rows = executar_query("agentes:buscar_por_especialidade", params=("agenda",))
    if not rows:
        raise RuntimeError("Agente 'agenda' não encontrado — rode scripts.seed.")
    return rows[0]["id"]


def _agora() -> datetime:
    return datetime.now(ZoneInfo(settings.timezone_padrao))


def _pendente_aberta(agente_id: int) -> dict | None:
    rows = executar_query("acoes_pendentes:buscar_pendente_por_agente", params=(agente_id,))
    return rows[0] if rows else None


def _montar_contexto_negociacao(pedido_original: str, pendente: dict | None, resposta_chefe: str | None) -> str:
    partes = [f'Pedido original do chefe: "{pedido_original}"']
    if pendente and resposta_chefe:
        partes.append(f'Você propôs: "{pendente["descricao"]}"')
        partes.append(f'O chefe respondeu: "{resposta_chefe}"')
        partes.append("Gere uma nova proposta ajustada, considerando essa resposta.")
    return "\n".join(partes)


async def _acionar_agente(
    agente_id: int, pedido_original: str, pendente: dict | None, resposta_chefe: str | None
) -> dict:
    contexto = _montar_contexto_negociacao(pedido_original, pendente, resposta_chefe)
    decisao = await decidir(contexto, _agora().isoformat())

    if decisao.tipo == "resposta":
        # só informativo — nada fica pendente, não há o que confirmar
        return {"mensagem": decisao.mensagem, "acao_pendente_id": None, "aguardando_confirmacao": False}

    if decisao.tipo == "pergunta":
        rows = executar_query(
            "acoes_pendentes:inserir",
            returning=True,
            params=(
                agente_id,
                "aguardando_info",
                decisao.mensagem,
                json.dumps({"pedido_original": pedido_original}),
            ),
        )
        return {"mensagem": decisao.mensagem, "acao_pendente_id": rows[0]["id"], "aguardando_confirmacao": False}

    payload = dict(decisao.payload or {})
    payload["pedido_original"] = pedido_original
    rows = executar_query(
        "acoes_pendentes:inserir",
        returning=True,
        params=(agente_id, decisao.acao, decisao.mensagem, json.dumps(payload)),
    )
    return {"mensagem": decisao.mensagem, "acao_pendente_id": rows[0]["id"], "aguardando_confirmacao": True}


def _executar_acao_real(tipo: str, payload: dict) -> dict:
    if tipo == "criar_evento":
        return google_calendar.criar_evento_real(
            titulo=payload["titulo"],
            inicio_iso=payload["inicio_iso"],
            fim_iso=payload["fim_iso"],
            descricao=payload.get("descricao"),
        )
    if tipo == "mover_evento":
        return google_calendar.mover_evento_real(
            evento_id=payload["evento_id"],
            novo_inicio_iso=payload["novo_inicio_iso"],
            novo_fim_iso=payload["novo_fim_iso"],
        )
    if tipo == "cancelar_evento":
        google_calendar.cancelar_evento_real(evento_id=payload["evento_id"])
        return {"cancelado": True}
    raise ValueError(f"Tipo de ação desconhecido: {tipo}")


def _responder_consulta_direta() -> dict:
    """Consulta simples (listar/buscar) não precisa do agente — chama a
    API do Calendar direto, sem custo de LLM."""
    agora = _agora()
    fim = agora + timedelta(days=7)
    eventos = google_calendar.listar_eventos(agora.isoformat(), fim.isoformat())
    resumidos = google_calendar.resumir_eventos(eventos)
    if not resumidos:
        mensagem = "Você não tem nenhum compromisso nos próximos 7 dias."
    else:
        linhas = [f'- {e["titulo"]} ({e["inicio"]})' for e in resumidos]
        mensagem = "Seus próximos compromissos:\n" + "\n".join(linhas)
    return {"mensagem": mensagem, "acao_pendente_id": None, "aguardando_confirmacao": False}


async def processar_mensagem(mensagem: str) -> dict:
    agente_id = _agente_id()
    pendente = _pendente_aberta(agente_id)

    if pendente:
        pedido_original = pendente["payload"].get("pedido_original", mensagem)

        if pendente["tipo"] != "aguardando_info" and _PADRAO_CONFIRMACAO.match(mensagem):
            return confirmar_acao(pendente["id"])

        if pendente["tipo"] != "aguardando_info" and _PADRAO_REJEICAO.match(mensagem):
            executar_query("acoes_pendentes:marcar_rejeitada", commit=True, params=(pendente["id"],))
            return await _acionar_agente(agente_id, pedido_original, pendente, mensagem)

        # resposta livre (ajuste ou resposta a uma pergunta) — continua a negociação
        return await _acionar_agente(agente_id, pedido_original, pendente, mensagem)

    if _PADRAO_CONSULTA.search(mensagem):
        return _responder_consulta_direta()

    return await _acionar_agente(agente_id, mensagem, None, None)


def confirmar_acao(acao_id: int) -> dict:
    rows = executar_query("acoes_pendentes:buscar_por_id", params=(acao_id,))
    if not rows:
        raise ValueError(f"Ação pendente {acao_id} não encontrada.")
    acao = rows[0]
    if acao["status"] != "pendente":
        return {"mensagem": f"Essa ação já foi {acao['status']}, nada a fazer.", "acao_pendente_id": acao_id}

    try:
        resultado = _executar_acao_real(acao["tipo"], acao["payload"])
        executar_query(
            "acoes_pendentes:marcar_confirmada_sucesso",
            commit=True,
            params=(json.dumps(resultado, default=str), acao_id),
        )
        return {"mensagem": "Feito — ação confirmada e executada.", "acao_pendente_id": acao_id, "resultado": resultado}
    except Exception as exc:
        executar_query("acoes_pendentes:marcar_confirmada_erro", commit=True, params=(str(exc), acao_id))
        return {"mensagem": f"A ação foi confirmada mas falhou ao executar: {exc}", "acao_pendente_id": acao_id}


def rejeitar_acao(acao_id: int) -> dict:
    executar_query("acoes_pendentes:marcar_rejeitada", commit=True, params=(acao_id,))
    return {"mensagem": "Ação descartada.", "acao_pendente_id": acao_id}
