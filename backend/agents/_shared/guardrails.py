"""Guardrails compartilhados entre agentes com tool-calling de verdade
(create_agent) — hoje só o Agenda usa, mas qualquer agente futuro que
precise reusa daqui em vez de duplicar.

- @wrap_tool_call captura qualquer exceção de tool e devolve um
  ToolMessage de erro em vez de deixar o crash propagar OU deixar o
  agente decidir "tentar de novo" (cada tentativa é uma chamada de LLM —
  sem isso, uma tool que falha repetidamente vira uma sequência de
  chamadas sem fim, cada uma custando token de verdade).
- MAX_TOOL_CALLS é o teto "soft" (comunicado no prompt do agente).
- RECURSION_LIMIT é o teto "hard" (imposto pelo LangGraph de verdade —
  ver agents/agenda/agente.py, onde vira GraphRecursionError se estourar,
  nunca fica rodando sem parar por mais que o modelo insista).
"""
import time
import traceback

from langchain.agents.middleware import wrap_tool_call
from langchain_core.messages import ToolMessage

MAX_TOOL_CALLS = 6
RECURSION_LIMIT = 12


@wrap_tool_call
async def tratar_erros_tools(request, handler):
    """Intercepta toda chamada de tool. Se a tool lançar qualquer
    exceção, devolve um ToolMessage de erro em vez de deixar o crash
    propagar. O agente recebe o erro no contexto e é instruído (no
    conteúdo da mensagem) a NÃO tentar de novo."""
    tool_name = request.tool_call["name"]
    tool_call_id = request.tool_call["id"]
    inicio = time.monotonic()

    try:
        resultado = await handler(request)
        duracao = round(time.monotonic() - inicio, 3)
        print(f"[tool] {tool_name} -> ok ({duracao}s)")
        return resultado
    except Exception as exc:
        duracao = round(time.monotonic() - inicio, 3)
        tb = traceback.format_exc()
        print(f"[tool] {tool_name} -> ERRO ({duracao}s): {exc}\n{tb}")

        mensagem_erro = (
            f"ERRO na tool '{tool_name}': {type(exc).__name__}: {exc}. "
            "NÃO tente chamar essa tool de novo nessa execução. Se não "
            "conseguir continuar sem esse dado, responda com "
            "tipo='pergunta' explicando objetivamente o que deu errado."
        )
        return ToolMessage(content=mensagem_erro, tool_call_id=tool_call_id)
