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
    descricao_bruta: str  # exatamente como veio do arquivo
    descricao_normalizada: str  # limpa, ajuda recorrência e fica legível no relatório
    identificador_banco: str | None = None  # ID único do banco (ex: UUID do Nubank),
    # quando o formato oferecer um — vira a chave de dedup preferida, mais
    # confiável que data+valor+descrição (duas transações reais podem ter
    # os três iguais, ex: dois Pix do mesmo valor pra mesma pessoa no mesmo dia)
