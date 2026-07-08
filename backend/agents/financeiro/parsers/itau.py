"""Parser do extrato CSV do Itaú (conta corrente).

FORMATO ASSUMIDO: colunas "data;lançamento;valor", data em DD/MM/AAAA, valor
com sinal e decimal em vírgula. Itaú às vezes exporta linhas de
cabeçalho/metadado antes da tabela de verdade — este parser procura a
primeira linha que parece o cabeçalho real antes de ler.

⚠️ Ainda não validado contra um export real do Itaú — o layout deles varia
bastante entre contas/versões do internet banking. Preciso de uma amostra
real (pode redigir os valores) antes de confiar nele com dado de verdade.
"""
import csv
import io
import re
from datetime import datetime

from agents.financeiro.parsers import TransacaoBruta


def _parse_valor_br(valor_str: str) -> float:
    limpo = valor_str.strip().replace(".", "").replace(",", ".")
    return float(limpo)


def _normalizar_descricao(descricao: str) -> str:
    return re.sub(r"\s+", " ", descricao).strip().title()


def _encontrar_inicio_tabela(linhas: list[str]) -> int:
    """Procura a primeira linha que parece o cabeçalho real da tabela,
    pulando linhas de metadado que o Itaú às vezes inclui antes dela."""
    for i, linha in enumerate(linhas):
        cabecalho = linha.lower()
        if "data" in cabecalho and ("lançamento" in cabecalho or "lancamento" in cabecalho or "valor" in cabecalho):
            return i
    return 0


def parse(conteudo: str) -> list[TransacaoBruta]:
    linhas = conteudo.splitlines()
    inicio = _encontrar_inicio_tabela(linhas)
    leitor = csv.DictReader(io.StringIO("\n".join(linhas[inicio:])), delimiter=";")

    transacoes = []
    for linha in leitor:
        data_str = linha.get("data") or linha.get("Data")
        valor_str = linha.get("valor") or linha.get("Valor")
        descricao_bruta = (
            linha.get("lançamento")
            or linha.get("lancamento")
            or linha.get("Lançamento")
            or linha.get("descrição")
            or ""
        ).strip()
        if not data_str or not valor_str:
            continue

        data = datetime.strptime(data_str.strip(), "%d/%m/%Y").date()
        valor_bruto = _parse_valor_br(valor_str)
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
