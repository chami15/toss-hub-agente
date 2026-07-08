"""Tipo comum que todo parser de banco precisa produzir.

Cada parser (itau.py, nubank.py) recebe o conteúdo cru do CSV e devolve uma
lista de `TransacaoBruta` já no formato interno — o resto do sistema não
sabe nem precisa saber de qual banco veio.
"""
from dataclasses import dataclass
from datetime import date


@dataclass
class TransacaoBruta:
    data: date
    valor: float  # sempre positivo; `tipo` indica a direção
    tipo: str  # "entrada" | "saida"
    descricao_bruta: str  # exatamente como veio do arquivo (usada no hash de dedup)
    descricao_normalizada: str  # limpa, ajuda recorrência e fica legível no relatório
