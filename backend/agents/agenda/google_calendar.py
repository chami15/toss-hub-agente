"""Cliente autenticado do Google Calendar.

IMPORTANTE: a autorização interativa (abrir navegador, você logar) roda
SÓ em `scripts/autorizar_google_calendar.py`, um passo manual único —
nunca aqui. Se o fluxo interativo estivesse aqui, uma chamada de tool no
meio de uma requisição da API tentaria abrir navegador e esperar você
clicar, travando (ou falhando de forma imprevisível) a requisição. Esse
foi um bug real do primeiro rascunho deste arquivo.

Aqui só CARREGA um token já existente e o RENOVA se expirado — se não
tiver `token.json` válido, falha rápido e claro, orientando a rodar o
script de autorização, em vez de tentar logar sozinho.

Escopo `calendar.events` (não `calendar` genérico) — só gerencia eventos,
não calendários inteiros. Princípio de menor privilégio.

Nunca comitar `credentials.json` nem `token.json` (ambos no .gitignore).

Funções aqui são as chamadas REAIS à API — determinísticas, sem LLM.
As de escrita (criar/mover/cancelar) só são chamadas depois que uma
`acao_pendente` foi confirmada (ver resolvers/agenda.py); nunca direto
a partir de uma tool do agente.
"""
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from config import settings

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]

_service = None


def _carregar_credenciais() -> Credentials:
    try:
        creds = Credentials.from_authorized_user_file(settings.google_token_path, SCOPES)
    except FileNotFoundError:
        raise RuntimeError(
            f"Google Calendar ainda não autorizado (não achei "
            f"'{settings.google_token_path}'). Rode "
            "'python -m scripts.autorizar_google_calendar' uma vez, na sua "
            "máquina, antes de usar o agente de Agenda."
        )

    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(settings.google_token_path, "w") as arquivo_token:
                arquivo_token.write(creds.to_json())
        else:
            raise RuntimeError(
                "Token do Google Calendar expirado e sem refresh token válido. "
                "Rode 'python -m scripts.autorizar_google_calendar' de novo."
            )

    return creds


def _get_service():
    global _service
    if _service is None:
        _service = build("calendar", "v3", credentials=_carregar_credenciais())
    return _service


def resumir_eventos(eventos: list[dict]) -> list[dict]:
    """Extrai só os campos úteis (id/título/início/fim) do formato bruto
    da API — usado tanto pelas tools do agente quanto por respostas
    diretas do resolver que não passam pelo LLM."""
    return [
        {
            "id": e.get("id"),
            "titulo": e.get("summary", "(sem título)"),
            "inicio": e.get("start", {}).get("dateTime") or e.get("start", {}).get("date"),
            "fim": e.get("end", {}).get("dateTime") or e.get("end", {}).get("date"),
        }
        for e in eventos
    ]


def listar_eventos(data_inicio_iso: str, data_fim_iso: str) -> list[dict]:
    """Lista eventos no período [data_inicio_iso, data_fim_iso), ambos em
    ISO 8601 com timezone (ex: '2026-07-10T00:00:00-03:00')."""
    resultado = (
        _get_service()
        .events()
        .list(
            calendarId=settings.google_calendar_id,
            timeMin=data_inicio_iso,
            timeMax=data_fim_iso,
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )
    return resultado.get("items", [])


def buscar_eventos(termo: str, data_inicio_iso: str | None = None, data_fim_iso: str | None = None) -> list[dict]:
    """Busca eventos por texto livre (título/descrição/local), com filtro
    de período opcional."""
    kwargs = {"calendarId": settings.google_calendar_id, "q": termo, "singleEvents": True, "orderBy": "startTime"}
    if data_inicio_iso:
        kwargs["timeMin"] = data_inicio_iso
    if data_fim_iso:
        kwargs["timeMax"] = data_fim_iso
    resultado = _get_service().events().list(**kwargs).execute()
    return resultado.get("items", [])


def criar_evento_real(titulo: str, inicio_iso: str, fim_iso: str, descricao: str | None = None) -> dict:
    """Chamada real de criação — só deve ser chamada após confirmação
    humana de uma ação_pendente, nunca direto por uma tool do agente."""
    corpo = {
        "summary": titulo,
        "start": {"dateTime": inicio_iso},
        "end": {"dateTime": fim_iso},
    }
    if descricao:
        corpo["description"] = descricao
    return _get_service().events().insert(calendarId=settings.google_calendar_id, body=corpo).execute()


def mover_evento_real(evento_id: str, novo_inicio_iso: str, novo_fim_iso: str) -> dict:
    """Chamada real de atualização de horário — só após confirmação."""
    corpo = {"start": {"dateTime": novo_inicio_iso}, "end": {"dateTime": novo_fim_iso}}
    return (
        _get_service()
        .events()
        .patch(calendarId=settings.google_calendar_id, eventId=evento_id, body=corpo)
        .execute()
    )


def cancelar_evento_real(evento_id: str) -> None:
    """Chamada real de cancelamento — só após confirmação."""
    _get_service().events().delete(calendarId=settings.google_calendar_id, eventId=evento_id).execute()
