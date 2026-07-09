"""Agente de Agenda — negociação de horário guiada, nunca chat livre.

Diferente do Financeiro (uma chamada estruturada sobre dado pronto), esse
agente precisa RACIOCINAR: checar a agenda existente, julgar se um
horário faz sentido pro tipo de compromisso, e propor UMA coisa concreta
por vez. Por isso usa `create_agent` de verdade, com tools de leitura —
mas a saída final é sempre estruturada (`response_format`), nunca texto
livre solto, e a escrita (criar/mover/cancelar) nunca acontece aqui: o
agente só PROPÕE, o resolver é quem grava a ação_pendente e quem executa
de verdade depois da confirmação humana.
"""
from typing import Literal

from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain.chat_models import init_chat_model
from langgraph.errors import GraphRecursionError
from pydantic import BaseModel, Field

from agents._shared.guardrails import MAX_TOOL_CALLS, RECURSION_LIMIT, tratar_erros_tools
from agents.agenda.tools import buscar_eventos, listar_eventos_periodo
from config import settings

load_dotenv()

TOOLS = [listar_eventos_periodo, buscar_eventos]


class DecisaoAgenda(BaseModel):
    tipo: Literal["proposta", "pergunta"] = Field(
        ...,
        description="'proposta' se já tem uma sugestão concreta e acionável; "
        "'pergunta' se precisa de mais informação antes de propor.",
    )
    mensagem: str = Field(..., description="Texto exato que o chefe vai ver — direto, sem enrolação.")
    acao: Literal["criar_evento", "mover_evento", "cancelar_evento"] | None = Field(
        default=None, description="Preenchido só quando tipo=='proposta'."
    )
    payload: dict | None = Field(
        default=None,
        description=(
            "Dados pra executar a ação se confirmada. Preenchido só quando tipo=='proposta'. "
            "criar_evento: {titulo, inicio_iso, fim_iso, descricao?}. "
            "mover_evento: {evento_id, novo_inicio_iso, novo_fim_iso}. "
            "cancelar_evento: {evento_id}."
        ),
    )


SYSTEM_PROMPT = """Você é o agente de Agenda do hub. Organizado, direto, um pouco
ansioso com prazo. Sua função é ajudar o chefe a agendar, mover ou cancelar
compromissos de forma prática — sem bate-papo, sem rodeio.

== REGRAS DE COMPORTAMENTO ==
1. Cada resposta sua propõe UMA coisa concreta por vez. Nunca liste várias
   opções, nunca faça pergunta aberta tipo "quando você prefere?".
2. Antes de propor qualquer horário, SEMPRE confira a agenda existente com
   as tools disponíveis (listar_eventos_periodo ou buscar_eventos) — nunca
   proponha um horário sem checar conflito primeiro.
2.1. Máximo de {max_tool_calls} chamadas de tool no total. Se uma tool
   retornar erro, NÃO tente de novo — responda com tipo='pergunta'
   explicando o que não foi possível verificar.
3. Use bom senso de horário conforme o TIPO de compromisso:
   - Reunião de trabalho: horário comercial, nunca de noite nem manhã muito cedo.
   - Refeição (almoço/jantar): respeita o horário de refeição de verdade
     (almoço ~12h-14h, jantar ~19h-21h) — nunca almoço às 16h nem jantar às 11h.
   - Compromisso pessoal/lazer: à noite ou fim de semana é razoável.
   Nunca proponha um horário claramente inadequado pro tipo de evento.
4. Se não tiver informação suficiente pra propor um horário concreto (ex:
   não sabe em que dia/semana o chefe quer), faça UMA pergunta objetiva e
   pare — não invente dado que não foi dito.
5. Se receber uma rejeição/ajuste de uma proposta anterior (isso vai vir
   explícito no contexto), gere UMA nova proposta ajustada — nunca repita
   a mesma sugestão.

== CONTEXTO ==
Data/hora atual: {agora}

== FORMATO DE SAÍDA ==
Sempre estruturado: tipo, mensagem, e (se tipo=="proposta") acao + payload
com os dados exatos necessários pra executar depois de confirmado.
"""

_agente = None


def _get_agente():
    global _agente
    if _agente is None:
        model = init_chat_model(f"openai:{settings.llm_model_cheap}", temperature=0.2)
        _agente = create_agent(
            model=model,
            tools=TOOLS,
            response_format=DecisaoAgenda,
            middleware=[tratar_erros_tools],
        )
    return _agente


async def decidir(mensagem_contexto: str, agora_iso: str) -> DecisaoAgenda:
    """`mensagem_contexto` já vem montada pelo resolver com o pedido
    original + histórico de proposta/rejeição, se houver (ver
    resolvers/agenda.py). Lança RuntimeError se a chamada falhar.

    `recursion_limit` é o teto físico — se o agente ficar girando (tool
    falhando repetidamente, por exemplo), o LangGraph interrompe sozinho
    em vez de continuar chamando a OpenAI sem parar."""
    agente = _get_agente()
    prompt_sistema = SYSTEM_PROMPT.format(agora=agora_iso, max_tool_calls=MAX_TOOL_CALLS)

    try:
        resultado = await agente.ainvoke(
            {
                "messages": [
                    {"role": "system", "content": prompt_sistema},
                    {"role": "user", "content": mensagem_contexto},
                ]
            },
            config={"recursion_limit": RECURSION_LIMIT},
        )
    except GraphRecursionError as exc:
        raise RuntimeError(
            f"O agente de agenda excedeu o limite de {RECURSION_LIMIT} passos sem "
            "concluir — provavelmente uma tool está falhando repetidamente. "
            "Confira os logs de tool acima e a autorização do Google Calendar."
        ) from exc
    except Exception as exc:
        raise RuntimeError(f"Falha ao invocar o agente de agenda: {exc}") from exc

    return resultado["structured_response"]
