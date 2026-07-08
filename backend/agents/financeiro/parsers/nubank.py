"""Parser do extrato CSV do Nubank (conta).

FORMATO ASSUMIDO (em ajuste — a primeira tentativa errou contra um export
real, ver histórico): data em DD/MM/AAAA, valor com sinal e decimal em
vírgula (ex: "-39,90" = saída). Detecta separador (`;` ou `,`) e aceita
algumas variações de nome de coluna, mas ainda depende de confirmação com
uma amostra real do arquivo pra fechar de vez.
"""
import csv
import io
import re
from datetime import datetime

from agents.financeiro.parsers import TransacaoBruta

_COLUNAS_DATA = ["Data", "data", "Date"]
_COLUNAS_VALOR = ["Valor", "valor", "Value", "Amount"]
_COLUNAS_DESCRICAO = ["Descrição", "descrição", "Descricao", "descricao", "Título", "title"]


def _parse_valor(valor_str: str, formato_br: bool) -> float:
    """Converte o valor pro float certo. Se o separador de campo do CSV é
    vírgula, o decimal do valor não pode também ser vírgula (quebraria o
    parsing) — nesse caso o número já vem com ponto decimal."""
    limpo = valor_str.strip()
    if formato_br:
        limpo = limpo.replace(".", "").replace(",", ".")
    return float(limpo)


def _normalizar_descricao(descricao: str) -> str:
    return re.sub(r"\s+", " ", descricao).strip().title()


def _campo(linha: dict, candidatos: list[str], colunas_disponiveis: list[str]) -> str:
    for nome in candidatos:
        if nome in linha:
            return linha[nome]
    raise ValueError(
        f"Nenhuma das colunas {candidatos} foi encontrada no CSV. "
        f"Colunas presentes no arquivo: {colunas_disponiveis}. "
        "O formato do export do Nubank não bate com o que o parser espera "
        "— precisa ajustar agents/financeiro/parsers/nubank.py."
    )


def _detectar_delimitador(conteudo: str) -> str:
    primeira_linha = conteudo.splitlines()[0] if conteudo else ""
    try:
        return csv.Sniffer().sniff(primeira_linha, delimiters=";,").delimiter
    except csv.Error:
        return ";"


def parse(conteudo: str) -> list[TransacaoBruta]:
    delimitador = _detectar_delimitador(conteudo)
    formato_br = delimitador == ";"
    leitor = csv.DictReader(io.StringIO(conteudo), delimiter=delimitador)

    transacoes = []
    for linha in leitor:
        colunas_disponiveis = list(linha.keys())
        data_str = _campo(linha, _COLUNAS_DATA, colunas_disponiveis)
        valor_str = _campo(linha, _COLUNAS_VALOR, colunas_disponiveis)
        descricao_bruta = _campo(linha, _COLUNAS_DESCRICAO, colunas_disponiveis).strip()

        data = datetime.strptime(data_str.strip(), "%d/%m/%Y").date()
        valor_bruto = _parse_valor(valor_str, formato_br)
        tipo = "saida" if valor_bruto < 0 else "entrada"

        transacoes.append(
            TransacaoBruta(
                data=data,
                valor=abs(valor_bruto),
                tipo=tipo,
                descricao_bruta=descricao_bruta,
                descricao_normalizada=_normalizar_descricao(descricao_bruta),
            )
        )
    return transacoes
