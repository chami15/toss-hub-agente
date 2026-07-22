"""Testes do domínio Financeiro: import de extrato (parser real do
Nubank + dedup por hash), dashboard calculado ao vivo, e relatório mensal
(LLM mockado, nunca chamado a real)."""
from datetime import date
from unittest.mock import AsyncMock, patch

import resolvers.financeiro as financeiro
from agents.financeiro.agente import AnaliseFinanceira

_CSV_NUBANK = (
    "Data,Valor,Identificador,Descrição\n"
    "01/06/2026,-45.00,id-001,MERCADO XYZ\n"
    "02/06/2026,1500.00,id-002,SALARIO\n"
    "03/06/2026,-20.50,id-003,UBER\n"
).encode("utf-8")


class TestImportarExtrato:
    def test_importa_e_categoriza(self):
        resultado = financeiro.importar_extrato("nubank", "extrato.csv", _CSV_NUBANK)
        assert resultado["novas"] == 3
        assert resultado["duplicadas"] == 0
        assert resultado["periodo_inicio"] == "2026-06-01"
        assert resultado["periodo_fim"] == "2026-06-03"

    def test_reimportar_mesmo_arquivo_nao_duplica(self):
        financeiro.importar_extrato("nubank", "extrato.csv", _CSV_NUBANK)
        resultado = financeiro.importar_extrato("nubank", "extrato.csv", _CSV_NUBANK)
        assert resultado["novas"] == 0
        assert resultado["duplicadas"] == 3

    def test_banco_nao_suportado(self):
        import pytest
        with pytest.raises(ValueError, match="Banco não suportado"):
            financeiro.importar_extrato("banco-fantasma", "x.csv", b"")


class TestDashboard:
    def test_calcula_kpis_do_mes(self):
        financeiro.importar_extrato("nubank", "extrato.csv", _CSV_NUBANK)
        dashboard = financeiro.obter_dashboard(date(2026, 6, 1))
        assert dashboard["kpis"]["gasto_mensal"] == 65.5  # 45 + 20.5
        assert dashboard["kpis"]["ganho_mensal"] == 1500.0

    def test_mes_sem_dado_nao_quebra(self):
        dashboard = financeiro.obter_dashboard(date(2020, 1, 1))
        assert dashboard["kpis"]["gasto_mensal"] == 0.0


class TestRelatorioMensal:
    async def test_gera_e_persiste_sem_expor_metadados_de_custo(self):
        financeiro.importar_extrato("nubank", "extrato.csv", _CSV_NUBANK)

        analise = AnaliseFinanceira(
            padroes_identificados=["Gasto concentrado em mercado."],
            recomendacoes=["Revisar assinatura X."],
            resumo_textual="Mês estável.",
        )
        resultado_mock = {"analise": analise, "modelo": "gpt-4o", "tokens_in": 100, "tokens_out": 50, "custo_usd": 0.001}

        with patch("resolvers.financeiro.agente_financeiro.gerar_analise", new=AsyncMock(return_value=resultado_mock)):
            relatorio = await financeiro.gerar_relatorio(date(2026, 6, 1))

        assert relatorio["analise"]["resumo_textual"] == "Mês estável."
        assert "modelo" not in relatorio
        assert "custo_usd" not in relatorio

        consultado = financeiro.obter_relatorio(date(2026, 6, 1))
        assert consultado["analise"]["resumo_textual"] == "Mês estável."

    def test_relatorio_inexistente_retorna_none(self):
        assert financeiro.obter_relatorio(date(2099, 1, 1)) is None
