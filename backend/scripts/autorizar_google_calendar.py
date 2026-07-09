"""Autoriza o acesso ao Google Calendar — roda isso UMA VEZ, na mão, antes
de usar o agente de Agenda. Abre o navegador pra você logar e autorizar
sua conta; grava o token.json.

Isso NUNCA roda automaticamente durante uma requisição da API — só aqui,
de propósito (ver aviso no topo de agents/agenda/google_calendar.py sobre
por que isso importa).

Uso (a partir da pasta backend/):  python -m scripts.autorizar_google_calendar
"""
from google_auth_oauthlib.flow import InstalledAppFlow

from agents.agenda.google_calendar import SCOPES
from config import settings


def main() -> None:
    flow = InstalledAppFlow.from_client_secrets_file(settings.google_credentials_path, SCOPES)
    creds = flow.run_local_server(port=0)
    with open(settings.google_token_path, "w") as arquivo_token:
        arquivo_token.write(creds.to_json())
    print(f"Autorizado! Token salvo em '{settings.google_token_path}'.")


if __name__ == "__main__":
    main()
