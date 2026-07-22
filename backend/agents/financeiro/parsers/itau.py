"""Parser do extrato PDF do Itaú (conta corrente).

O Itaú só oferece extrato de conta em PDF (sem CSV/OFX). O PDF não tem
grade de tabela desenhada — as colunas são só texto alinhado por posição.
Extração por reconstrução posicional: calibra os limites de cada coluna a
partir da própria linha de cabeçalho ("data / lançamentos / valor (R$) /
saldo (R$)"), agrupa palavras por linha (mesma altura) e por coluna
(posição x). Validado contra um extrato real — 40/40 linhas reconstruídas
corretamente, sem ambiguidade.

Duas "formas" de linha, distinguidas pela coluna preenchida:
  - lançamento de verdade: tem valor, não tem saldo -> vira TransacaoBruta.
  - "SALDO DO DIA": marcador de saldo do dia, tem saldo, não tem valor ->
    não é transação, mas alimenta uma checagem de consistência (a soma dos
    lançamentos do período tem que bater com a diferença entre o saldo
    mais antigo e o mais recente).

Cabeçalho/rodapé (título da seção, aviso legal) não têm um token no
formato dd/mm/aaaa na posição x da coluna "data" — por isso o filtro por
data já exclui esse ruído sem precisar de lógica extra de corte.

Sem identificador único por lançamento (diferente do Nubank) — o dedup
cai no hash composto reforçado com contador de ordem (ver
resolvers/financeiro.py), pra não perder lançamento legítimo repetido no
mesmo dia com mesmo valor/descrição.
"""
import io
import re
from datetime import date, datetime

import pdfplumber

from agents.financeiro.parsers import TransacaoBruta

_PADRAO_DATA = re.compile(r"^\d{2}/\d{2}/\d{4}$")
_PADRAO_VALOR = re.compile(r"-?\d[\d.]*,\d{2}")

Limites = tuple[float, float, float]


def _normalizar_descricao(descricao: str) -> str:
    return re.sub(r"\s+", " ", descricao).strip().title()


def _parse_valor_br(valor_str: str) -> float:
    limpo = valor_str.strip().replace(".", "").replace(",", ".")
    return float(limpo)


def _calibrar_colunas(words: list[dict]) -> Limites | None:
    """Acha a linha de cabeçalho real da tabela (onde 'data' e
    'lançamentos'/'lancamentos' aparecem na mesma altura) e devolve os 3
    limites de coluna, calibrados pela posição real das palavras — não
    depende de pixel fixo, se adapta a pequena variação entre PDFs."""
    candidatos_data = [w for w in words if w["text"].lower() == "data"]
    for cand in candidatos_data:
        mesma_linha = [w for w in words if abs(w["top"] - cand["top"]) < 2]
        por_texto = {w["text"].lower(): w for w in mesma_linha}
        lanc = por_texto.get("lançamentos") or por_texto.get("lancamentos")
        valor_w = por_texto.get("valor")
        saldo_w = por_texto.get("saldo")
        if lanc and valor_w and saldo_w:
            limite1 = (cand["x1"] + lanc["x0"]) / 2
            limite2 = valor_w["x0"] - 10
            limite3 = (valor_w["x0"] + saldo_w["x0"]) / 2
            return limite1, limite2, limite3
    return None


def _bucket(x0: float, limites: Limites) -> str:
    limite1, limite2, limite3 = limites
    if x0 < limite1:
        return "data"
    if x0 < limite2:
        return "lancamentos"
    if x0 < limite3:
        return "valor"
    return "saldo"


def _extrair_linhas(page, limites: Limites) -> list[dict]:
    words = page.extract_words()
    linhas: dict[float, list[dict]] = {}
    for w in words:
        chave = round(w["top"] / 2) * 2
        linhas.setdefault(chave, []).append(w)

    resultado = []
    for _top, ws in sorted(linhas.items()):
        colunas: dict[str, list[str]] = {"data": [], "lancamentos": [], "valor": [], "saldo": []}
        for w in ws:
            colunas[_bucket(w["x0"], limites)].append(w["text"])
        data_txt = " ".join(colunas["data"])
        if _PADRAO_DATA.match(data_txt):
            resultado.append(
                {
                    "data": data_txt,
                    "lancamentos": " ".join(colunas["lancamentos"]),
                    "valor": " ".join(colunas["valor"]),
                    "saldo": " ".join(colunas["saldo"]),
                }
            )
    return resultado


def _eh_saldo_do_dia(lancamentos_txt: str) -> bool:
    texto = lancamentos_txt.upper()
    return "SALDO" in texto and "DIA" in texto


def _validar_consistencia(transacoes: list[TransacaoBruta], checagens: list[tuple[date, float]]) -> None:
    """Confere se a soma assinada dos lançamentos bate com a diferença
    entre o saldo mais antigo e o mais recente do período. Só avisa (não
    bloqueia a importação) — é checagem de qualidade, não trava."""
    if len(checagens) < 2:
        return

    # checagens aparecem na ordem do PDF: mais recente primeiro
    saldo_mais_recente = checagens[0][1]
    saldo_mais_antigo = checagens[-1][1]

    soma_sinalizada = sum(t.valor if t.tipo == "entrada" else -t.valor for t in transacoes)
    esperado = round(saldo_mais_recente - saldo_mais_antigo, 2)
    obtido = round(soma_sinalizada, 2)

    if abs(esperado - obtido) > 0.01:
        print(
            f"[itau parser] AVISO: soma dos lançamentos ({obtido}) não bate com "
            f"a diferença de saldo do período ({esperado}) — possível erro de "
            "extração do PDF. Confira o resultado antes de confiar nele."
        )


def parse(conteudo: bytes) -> list[TransacaoBruta]:
    transacoes: list[TransacaoBruta] = []
    checagens: list[tuple[date, float]] = []
    limites: Limites | None = None

    with pdfplumber.open(io.BytesIO(conteudo)) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            limites_pagina = _calibrar_colunas(words)
            if limites_pagina:
                limites = limites_pagina  # recalibra se essa página tiver cabeçalho

            if limites is None:
                raise ValueError(
                    "Não encontrei a linha de cabeçalho da tabela (data/lançamentos/"
                    "valor/saldo) em nenhuma página até aqui — o layout do PDF pode "
                    "ter mudado. Precisa ajustar agents/financeiro/parsers/itau.py."
                )

            for linha in _extrair_linhas(page, limites):
                data = datetime.strptime(linha["data"], "%d/%m/%Y").date()

                if _eh_saldo_do_dia(linha["lancamentos"]):
                    match_saldo = _PADRAO_VALOR.search(linha["saldo"])
                    if match_saldo:
                        checagens.append((data, _parse_valor_br(match_saldo.group())))
                    continue

                match_valor = _PADRAO_VALOR.search(linha["valor"])
                if not match_valor:
                    continue  # linha com data mas sem valor reconhecível — ignora

                valor_bruto = _parse_valor_br(match_valor.group())
                tipo = "saida" if valor_bruto < 0 else "entrada"
                descricao_bruta = linha["lancamentos"].strip()

                transacoes.append(
                    TransacaoBruta(
                        data=data,
                        valor=abs(valor_bruto),
                        tipo=tipo,
                        descricao_bruta=descricao_bruta,
                        descricao_normalizada=_normalizar_descricao(descricao_bruta),
                    )
                )

    _validar_consistencia(transacoes, checagens)
    return transacoes
