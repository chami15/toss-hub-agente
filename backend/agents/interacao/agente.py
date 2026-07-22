"""Agente de interação social — Etapa 2 do motor de tick. Uma chamada
estruturada só, sem tool-calling e sem loop (mesmo Padrão A do resto do
hub): gera UMA mensagem social curta de um agente pra outro, dado o
histórico recente do par e um evento do mundo sorteado como gancho.

Toda a decisão de QUEM fala, COM QUEM fala e SE fala é resolvida antes
de chegar aqui (ver `resolvers/interacao.py`) — puramente aritmético,
sem custo de LLM. Esta função só entra depois que já foi decidido que
uma mensagem vai ser gerada de verdade.
"""
import json

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from pydantic import BaseModel, Field

from config import settings

load_dotenv()

_PROMPT_SOCIAL = """Você é {nome_remetente}, um agente colaborador do hub.
{personalidade}

Agora você está puxando papo social com {rotulo_destinatario} — é conversa
de copa, não um relatório formal. Curta e natural (1 a 3 frases), no seu
tom de sempre.

{fato_do_dia}

Histórico recente entre vocês dois (mais recente primeiro, pode estar
vazio se nunca conversaram):
{historico_json}

{evento_bloco}

Regras:
- NÃO repita um assunto que já aparece no histórico acima.
- Se houver um evento do mundo listado, use-o só como gancho/inspiração —
  nunca a única coisa mencionada. Traga também algo do seu próprio
  contexto ou opinião.
- Pode tocar em trabalho de forma informal (fofoca, comentário,
  opinião sobre uma tarefa ou sobre o chefe) — mas sempre no tom de
  bate-papo, nunca como um aviso/relatório formal.
- Sem formalidade, sem lista, sem assinatura — é só uma fala de bate-papo.
- {nota_chefe}
"""


class MensagemSocialGerada(BaseModel):
    conteudo: str = Field(..., min_length=1, max_length=500, description="A mensagem social em si, curta e natural.")


_model_social = None


def _get_model_social():
    global _model_social
    if _model_social is None:
        base = init_chat_model(f"openai:{settings.llm_model_cheap}", temperature=0.8)
        _model_social = base.with_structured_output(MensagemSocialGerada, include_raw=True)
    return _model_social


def _custo(tokens_in: int, tokens_out: int) -> float:
    preco_in = settings.preco_input_por_1k_barato
    preco_out = settings.preco_output_por_1k_barato
    return round((tokens_in / 1000) * preco_in + (tokens_out / 1000) * preco_out, 6)


def _extrair_resultado(resultado: dict) -> dict:
    if resultado.get("parsing_error"):
        raise RuntimeError(f"Saída fora do formato esperado: {resultado['parsing_error']}")

    raw = resultado["raw"]
    usage = getattr(raw, "usage_metadata", None) or {}
    tokens_in = usage.get("input_tokens", 0)
    tokens_out = usage.get("output_tokens", 0)

    return {
        "dado": resultado["parsed"],
        "modelo": settings.llm_model_cheap,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "custo_usd": _custo(tokens_in, tokens_out),
    }


async def gerar_mensagem_social(
    personalidade: str,
    nome_remetente: str,
    nome_destinatario: str,
    historico_recente: list[dict],
    evento_mundo: str | None,
    fato_do_dia: str,
    destinatario_eh_chefe: bool = False,
    mensagem_para_responder: str | None = None,
) -> dict:
    """Lança RuntimeError se a chamada ou o parsing falharem — uma
    tentativa só, sem retry automático.

    Quando `mensagem_para_responder` vem preenchida, o bloco de
    evento/gancho normal é substituído por uma instrução de responder
    de verdade ao que foi dito — nesse caso já existe assunto (a
    própria mensagem recebida), não precisa de gancho novo."""
    modelo = _get_model_social()
    if mensagem_para_responder:
        evento_bloco = (
            f'Você está RESPONDENDO a esta mensagem que {nome_destinatario} te mandou: '
            f'"{mensagem_para_responder}" — responda de verdade ao que foi dito, não puxe outro assunto do nada.'
        )
    else:
        evento_bloco = (
            f'Evento do mundo disponível como gancho: "{evento_mundo}"'
            if evento_mundo
            else "Nenhum evento do mundo disponível — puxe assunto com seu próprio contexto."
        )
    if destinatario_eh_chefe:
        rotulo_destinatario = f"seu chefe, {nome_destinatario}"
        nota_chefe = "Ele é o chefe — mantenha um tom simpático e um pouco mais respeitoso que com um colega."
    else:
        rotulo_destinatario = f"seu colega de escritório, {nome_destinatario}"
        nota_chefe = "É um colega, pode ser mais à vontade."
    prompt = _PROMPT_SOCIAL.format(
        nome_remetente=nome_remetente,
        personalidade=personalidade or "",
        rotulo_destinatario=rotulo_destinatario,
        fato_do_dia=fato_do_dia,
        historico_json=json.dumps(historico_recente, ensure_ascii=False, default=str),
        evento_bloco=evento_bloco,
        nota_chefe=nota_chefe,
    )
    try:
        resultado = await modelo.ainvoke(prompt)
    except Exception as exc:
        raise RuntimeError(f"Falha ao chamar o modelo de mensagem social: {exc}") from exc

    return _extrair_resultado(resultado)
