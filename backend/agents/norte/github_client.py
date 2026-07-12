"""Cliente autenticado do GitHub — leitura determinística, sem LLM.

IMPORTANTE: a autorização interativa (Device Flow) roda SÓ em
`scripts/autorizar_github.py`, um passo manual único — nunca aqui, mesmo
motivo do Google Calendar (ver aviso em agents/agenda/google_calendar.py):
uma tool/chamada no meio de uma requisição da API não pode ficar esperando
o chefe aprovar um device code em outra aba.

Aqui só CARREGA um token já existente. Se não tiver `github_token.json`
válido, falha rápido e claro, orientando a rodar o script de autorização.

Escopo `repo` (configurável via GITHUB_OAUTH_SCOPE) — leitura de
repositório privado/público. Nunca escreve nada no GitHub — o agente
Norte só lê, todo o resto (criar/aceitar/rejeitar card) vive no nosso
próprio banco.

Nunca comitar `github_token.json` (está no .gitignore).
"""
import json

import requests

from config import settings

API_BASE = "https://api.github.com"

# Ordem de prioridade pra achar o manifest de stack do projeto — primeiro
# que existir é usado, não precisa checar todos.
_MANIFESTS_CONHECIDOS = (
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "Cargo.toml",
    "go.mod",
    "composer.json",
)

_sessao = None


def _carregar_token() -> str:
    try:
        with open(settings.github_token_path, "r", encoding="utf-8") as arquivo:
            dados = json.load(arquivo)
    except FileNotFoundError:
        raise RuntimeError(
            f"GitHub ainda não autorizado (não achei '{settings.github_token_path}'). "
            "Rode 'python -m scripts.autorizar_github' uma vez, na sua máquina, "
            "antes de usar o agente Norte."
        )
    access_token = dados.get("access_token")
    if not access_token:
        raise RuntimeError(
            f"'{settings.github_token_path}' existe mas não tem 'access_token' — "
            "rode 'python -m scripts.autorizar_github' de novo."
        )
    return access_token


def _get_sessao() -> requests.Session:
    global _sessao
    if _sessao is None:
        sessao = requests.Session()
        sessao.headers.update({
            "Authorization": f"Bearer {_carregar_token()}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        })
        _sessao = sessao
    return _sessao


def _get(path: str, headers: dict | None = None) -> requests.Response:
    resposta = _get_sessao().get(f"{API_BASE}{path}", headers=headers)
    if resposta.status_code >= 400:
        raise RuntimeError(f"GitHub API falhou em {path}: {resposta.status_code} {resposta.text[:300]}")
    return resposta


def obter_branch_padrao(owner: str, repo: str) -> str:
    return _get(f"/repos/{owner}/{repo}").json()["default_branch"]


def obter_commit_mais_recente(owner: str, repo: str) -> dict:
    """SHA + mensagem do commit mais recente da branch padrão."""
    branch = obter_branch_padrao(owner, repo)
    commits = _get(f"/repos/{owner}/{repo}/commits?sha={branch}&per_page=1").json()
    if not commits:
        raise RuntimeError(f"Repositório {owner}/{repo} não tem nenhum commit.")
    commit = commits[0]
    return {"sha": commit["sha"], "mensagem": commit["commit"]["message"]}


def obter_arvore_raiz(owner: str, repo: str) -> list[dict]:
    """Estrutura de alto nível — só o nível raiz do repositório, NÃO
    recursivo (decisão deliberada: contexto raso, ver conversa de
    design). Cada item: {"path": ..., "type": "blob" | "tree"}."""
    branch = obter_branch_padrao(owner, repo)
    dados = _get(f"/repos/{owner}/{repo}/git/trees/{branch}").json()
    return [{"path": item["path"], "type": item["type"]} for item in dados.get("tree", [])]


def obter_readme(owner: str, repo: str) -> str | None:
    try:
        resposta = _get(f"/repos/{owner}/{repo}/readme", headers={"Accept": "application/vnd.github.raw+json"})
    except RuntimeError as exc:
        if "404" in str(exc):
            return None
        raise
    return resposta.text


_TAMANHO_MAX_MANIFEST = 2000  # caracteres por manifest, pra não inflar o contexto


def obter_manifest(owner: str, repo: str, arvore_raiz: list[dict] | None = None) -> list[dict]:
    """Todos os manifests conhecidos que existirem — na raiz E dentro de
    cada subpasta real do repositório (usa `arvore_raiz`, já coletada,
    pra saber quais subpastas existem de verdade, em vez de adivinhar
    nomes tipo "backend"/"frontend"). Projetos com backend e frontend
    separados (comum em monorepo pessoal) têm manifests em pastas
    diferentes — só olhar a raiz deixava a stack inferida incompleta (só
    o lado que por acaso tivesse manifest na raiz, ou nenhum dos dois).
    Devolve TODOS os encontrados, não só o primeiro."""
    caminhos_a_tentar = list(_MANIFESTS_CONHECIDOS)
    if arvore_raiz:
        pastas = [item["path"] for item in arvore_raiz if item["type"] == "tree"]
        caminhos_a_tentar += [f"{pasta}/{manifesto}" for pasta in pastas for manifesto in _MANIFESTS_CONHECIDOS]

    encontrados = []
    for caminho in caminhos_a_tentar:
        try:
            resposta = _get(
                f"/repos/{owner}/{repo}/contents/{caminho}",
                headers={"Accept": "application/vnd.github.raw+json"},
            )
        except RuntimeError as exc:
            if "404" in str(exc):
                continue
            raise
        encontrados.append({"arquivo": caminho, "conteudo": resposta.text[:_TAMANHO_MAX_MANIFEST]})
    return encontrados


def obter_mudancas_desde(owner: str, repo: str, sha_anterior: str, sha_atual: str, limite_arquivos: int = 30) -> dict:
    """Commits + arquivos alterados entre duas revisões, numa chamada só
    (API de comparação do GitHub) — usado pra saber o que é NOVO desde a
    última vez que geramos um card, sem reprocessar o repositório
    inteiro."""
    dados = _get(f"/repos/{owner}/{repo}/compare/{sha_anterior}...{sha_atual}").json()
    commits = [{"sha": c["sha"], "mensagem": c["commit"]["message"]} for c in dados.get("commits", [])]
    arquivos_alterados = [a["filename"] for a in dados.get("files", [])][:limite_arquivos]
    return {"commits": commits, "arquivos_alterados": arquivos_alterados}
