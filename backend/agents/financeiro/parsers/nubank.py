"""Parser do extrato CSV do Nubank (conta).

FORMATO ASSUMIDO: colunas `Data;Valor;Identificador;Descrição`, data em
DD/MM/AAAA, valor com sinal e decimal em vírgula (ex: "-39,90" = saída).

⚠️ Ainda não validado contra um export real do Nubank — escrito com base no
formato mais comumente documentado. Antes de confiar nele com dado de
verdade, preciso de uma amostra real (pode redigir os valores) do CSV
exportado, pra confirmar nomes de coluna e separador exatos.
"""
import csv
import io
import re
from datetime import datetime

from agents.financeiro.parsers import TransacaoBruta


def _parse_valor_br(valor_str: str) -> float:
    """Converte "-1.234,56" ou "1234,56" (formato BR) para float."""
    limpo = valor_str.strip().replace(".", "").replace(",", ".")
    return float(limpo)


def _normalizar_descricao(descricao: str) -> str:
    return re.sub(r"\s+", " ", descricao).strip().title()


def parse(conteudo: str) -> list[TransacaoBruta]:
    leitor = csv.DictReader(io.StringIO(conteudo), delimiter=";")
    transacoes = []
    for linha in leitor:
        data = datetime.strptime(linha["Data"].strip(), "%d/%m/%Y").date()
        valor_bruto = _parse_valor_br(linha["Valor"])
        tipo = "saida" if valor_bruto < 0 else "entrada"
        descricao_bruta = linha["Descrição"].strip()

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
