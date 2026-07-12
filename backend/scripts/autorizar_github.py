"""Autoriza o acesso ao GitHub (Device Flow) — roda isso UMA VEZ, na mão,
antes de usar o agente Norte. Mostra um código pra você digitar em
github.com/login/device; enquanto isso, fica esperando você aprovar e
grava o token quando terminar.

Precisa de um OAuth App do GitHub com "Device Flow" habilitado
(github.com/settings/developers -> seu app -> "Enable Device Flow") e do
client_id dele em GITHUB_CLIENT_ID no .env. Device Flow não usa/precisa
de client_secret.

Isso NUNCA roda automaticamente durante uma requisição da API — só aqui,
de propósito (mesmo motivo do Google Calendar, ver aviso no topo de
agents/norte/github_client.py).

Uso (a partir da pasta backend/):  python -m scripts.autorizar_github
"""
import time

import requests

from config import settings

DEVICE_CODE_URL = "https://github.com/login/device/code"
ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"


def main() -> None:
    if not settings.github_client_id:
        raise RuntimeError("GITHUB_CLIENT_ID não configurado no .env — crie um OAuth App no GitHub primeiro.")

    resposta = requests.post(
        DEVICE_CODE_URL,
        data={"client_id": settings.github_client_id, "scope": settings.github_oauth_scope},
        headers={"Accept": "application/json"},
    )
    resposta.raise_for_status()
    dados = resposta.json()

    print(f"Acesse {dados['verification_uri']} e digite o código: {dados['user_code']}")
    print("Aguardando você aprovar...")

    intervalo = dados["interval"]
    expira_em = time.time() + dados["expires_in"]

    while time.time() < expira_em:
        time.sleep(intervalo)
        resposta_token = requests.post(
            ACCESS_TOKEN_URL,
            data={
                "client_id": settings.github_client_id,
                "device_code": dados["device_code"],
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            },
            headers={"Accept": "application/json"},
        )
        resposta_token.raise_for_status()
        resultado = resposta_token.json()

        if "access_token" in resultado:
            with open(settings.github_token_path, "w", encoding="utf-8") as arquivo_token:
                arquivo_token.write(resposta_token.text)
            print(f"Autorizado! Token salvo em '{settings.github_token_path}'.")
            return

        erro = resultado.get("error")
        if erro == "authorization_pending":
            continue
        if erro == "slow_down":
            intervalo += 5
            continue
        raise RuntimeError(f"Falha na autorização: {resultado}")

    raise RuntimeError("Código expirou antes de você aprovar — rode o script de novo.")


if __name__ == "__main__":
    main()
