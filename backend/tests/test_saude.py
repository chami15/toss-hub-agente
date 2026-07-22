"""Testes do domínio de Saúde (Vita): perfil singleton, registros
determinísticos, refeição (com os guardrails de macro), ficha de treino
versionada, plano de dieta e relatório semanal (com a trava de 7 dias)."""
from datetime import date
from unittest.mock import AsyncMock, patch

import pytest

import resolvers.saude as saude
from agents.saude.agente import EstimativaRefeicao, PlanoDietaGerado, RelatorioSaudeGerado
from tests.helpers import resultado_agente, resultado_llm
from utils.query_executor import executar_query


def _historico_refeicoes() -> list:
    return executar_query("refeicoes:historico", params=(saude._inicio_do_dia(date(2000, 1, 1)),))


def _perfil_padrao():
    return {
        "nome": "Bernardo",
        "sexo": "M",
        "data_nascimento": date(1995, 5, 10),
        "altura_cm": 180,
        "objetivo": "emagrecer",
        "tem_diabetes": False,
        "restricoes_alimentares": None,
    }


class TestPerfil:
    def test_nao_existe_antes_de_criar(self):
        assert saude.obter_perfil() is None
        assert saude.perfil_existe() is False

    def test_criar_e_consultar(self):
        perfil = saude.salvar_perfil(_perfil_padrao())
        assert perfil["nome"] == "Bernardo"
        assert saude.perfil_existe() is True

    def test_atualizar_nao_duplica_singleton(self):
        saude.salvar_perfil(_perfil_padrao())
        atualizado = {**_perfil_padrao(), "nome": "Bernardo Cunha", "objetivo": "manter_peso"}
        saude.salvar_perfil(atualizado)
        assert saude.obter_perfil()["nome"] == "Bernardo Cunha"


class TestRegistrosDeterministicos:
    def test_peso_hidratacao_sono_atividade_sem_llm(self):
        peso = saude.registrar_peso(80.5)
        assert peso["peso_kg"] == 80.5

        hidratacao = saude.registrar_hidratacao(500)
        assert hidratacao["quantidade_ml"] == 500

        sono = saude.registrar_sono(7.5, "boa", None)
        assert sono["horas"] == 7.5

        atividade = saude.registrar_atividade("corrida", 30, "5km")
        assert atividade["duracao_min"] == 30

    def test_contexto_do_perfil_usa_peso_mais_recente_e_idade_calculada(self):
        saude.salvar_perfil(_perfil_padrao())
        saude.registrar_peso(80.5)
        contexto = saude._perfil_contexto()
        assert contexto["peso_kg_atual"] == 80.5
        assert contexto["idade"] == date.today().year - 1995 - (
            1 if (date.today().month, date.today().day) < (5, 10) else 0
        )

    def test_perfil_contexto_falha_sem_perfil_cadastrado(self):
        with pytest.raises(RuntimeError, match="ainda não configurado"):
            saude._perfil_contexto()


class TestRefeicao:
    def setup_method(self):
        saude.salvar_perfil(_perfil_padrao())

    async def test_registro_por_texto_com_sucesso(self):
        estimativa = EstimativaRefeicao(calorias=650, carboidratos_g=80, proteinas_g=25, gorduras_g=15, confianca="alta")
        with patch("resolvers.saude.agente_saude.estimar_macros_texto", new=AsyncMock(return_value=resultado_agente(estimativa))):
            refeicao = await saude.registrar_refeicao_texto("almoco", "arroz, feijão, frango")
        assert float(refeicao["calorias"]) == 650.0
        assert refeicao["confianca_estimativa"] == "alta"

    async def test_registro_por_foto_com_sucesso(self):
        estimativa = EstimativaRefeicao(calorias=650, carboidratos_g=80, proteinas_g=25, gorduras_g=15, confianca="alta")
        with patch("resolvers.saude.agente_saude.estimar_macros_foto", new=AsyncMock(return_value=resultado_agente(estimativa))):
            refeicao = await saude.registrar_refeicao_foto("jantar", b"fake-bytes", "image/jpeg", "pizza")
        assert refeicao["origem"] == "foto"
        assert refeicao["descricao"] == "pizza"

    async def test_erro_na_estimativa_nao_grava_nada(self):
        with patch(
            "resolvers.saude.agente_saude.estimar_macros_texto",
            new=AsyncMock(side_effect=RuntimeError("falha simulada")),
        ):
            with pytest.raises(RuntimeError):
                await saude.registrar_refeicao_texto("outro", "descrição qualquer")

        historico = _historico_refeicoes()
        assert historico == []

    async def test_sem_alimento_identificado_e_rejeitado_sem_gravar(self):
        # Mocka o MODELO (não a função inteira do agente) — precisa deixar
        # o guardrail real (_exigir_alimento_identificado) rodar de verdade,
        # senão o teste não prova nada sobre ele.
        estimativa = EstimativaRefeicao(calorias=600, carboidratos_g=70, proteinas_g=40, gorduras_g=15, confianca="baixa")
        with patch("agents.saude.agente._get_model_macro") as get_model:
            get_model.return_value.ainvoke = AsyncMock(return_value=resultado_llm(estimativa))
            with pytest.raises(ValueError, match="identificar nenhum alimento"):
                await saude.registrar_refeicao_texto("almoco", "qualquer coisa por ai")
        assert _historico_refeicoes() == []

    async def test_inconsistencia_aritmetica_e_corrigida_mas_ainda_salva(self):
        # Idem — precisa do guardrail real (_corrigir_consistencia) rodando.
        # comida identificada (confianca=media), mas calorias muito longe do que os macros implicam
        estimativa = EstimativaRefeicao(calorias=2900, carboidratos_g=80, proteinas_g=25, gorduras_g=15, confianca="media")
        with patch("agents.saude.agente._get_model_macro") as get_model:
            get_model.return_value.ainvoke = AsyncMock(return_value=resultado_llm(estimativa))
            refeicao = await saude.registrar_refeicao_texto("almoco", "arroz, feijão e frango")
        # 80*4 + 25*4 + 15*9 = 555
        assert float(refeicao["calorias"]) == 555.0
        assert refeicao["confianca_estimativa"] == "baixa"


class TestFichaDeTreino:
    def test_cadastro_e_consulta(self):
        saude.salvar_ficha_treino([
            {"dia_semana": "segunda", "grupo_muscular": "peito_triceps",
             "exercicios": [{"nome_exercicio": "supino", "series": 4, "repeticoes": 10}]},
        ])
        ficha = saude.obter_ficha_treino()
        assert len(ficha) == 1
        assert ficha[0]["dia_semana"] == "segunda"

    def test_edicao_preserva_historico(self):
        saude.salvar_ficha_treino([
            {"dia_semana": "segunda", "grupo_muscular": "peito_triceps",
             "exercicios": [{"nome_exercicio": "supino", "series": 4, "repeticoes": 10}]},
        ])
        saude.salvar_ficha_treino([
            {"dia_semana": "segunda", "grupo_muscular": "costas_biceps",
             "exercicios": [{"nome_exercicio": "puxada", "series": 3, "repeticoes": 12}]},
        ])
        ficha_atual = saude.obter_ficha_treino()
        assert len(ficha_atual) == 1
        assert ficha_atual[0]["grupo_muscular"] == "costas_biceps"

        from utils.db import Database
        with Database() as conn:
            conn.execute("SELECT COUNT(*) AS n FROM ficha_treino_dias WHERE dia_semana = %s", ("segunda",))
            total = conn.fetchall()[0]["n"]
        assert total == 2  # histórico preservado, não apagado


class TestPlanoDeDieta:
    def setup_method(self):
        saude.salvar_perfil(_perfil_padrao())

    async def test_gerar_e_consultar(self):
        plano = PlanoDietaGerado(meta_calorica=1800, carboidratos_g=180, proteinas_g=160, gorduras_g=50, orientacoes="coma bem")
        with patch("resolvers.saude.agente_saude.gerar_plano_dieta", new=AsyncMock(return_value=resultado_agente(plano))):
            resultado = await saude.gerar_plano_dieta()
        assert resultado["meta_calorica"] == 1800
        assert saude.obter_plano_dieta_atual()["id"] == resultado["id"]


class TestRelatorioSemanal:
    def setup_method(self):
        saude.salvar_perfil(_perfil_padrao())

    async def test_gera_e_bloqueia_segunda_geracao_na_mesma_semana(self):
        relatorio = RelatorioSaudeGerado(
            resumo="Semana ok.", evolucao_peso="Estável.", adesao_alimentar="Boa.",
            atividade_fisica="1 corrida.", recomendacoes=["Beber mais água."],
        )
        mock_gerar = AsyncMock(return_value=resultado_agente(relatorio))
        with patch("resolvers.saude.agente_saude.gerar_relatorio_semanal", new=mock_gerar):
            primeiro = await saude.gerar_relatorio_semanal()
        assert primeiro["analise"]["resumo"] == "Semana ok."
        assert mock_gerar.call_count == 1

        with patch("resolvers.saude.agente_saude.gerar_relatorio_semanal", new=mock_gerar):
            with pytest.raises(ValueError, match="Já existe relatório"):
                await saude.gerar_relatorio_semanal()
        # não chamou a LLM de novo pra descobrir que já existia
        assert mock_gerar.call_count == 1

    async def test_pode_consultar_relatorio_ja_gerado_sem_gerar_de_novo(self):
        relatorio = RelatorioSaudeGerado(
            resumo="x", evolucao_peso="y", adesao_alimentar="z", atividade_fisica="w", recomendacoes=["r"],
        )
        with patch("resolvers.saude.agente_saude.gerar_relatorio_semanal", new=AsyncMock(return_value=resultado_agente(relatorio))):
            await saude.gerar_relatorio_semanal()

        assert saude.obter_relatorio_semana_atual() is not None


class TestDashboard:
    def setup_method(self):
        saude.salvar_perfil(_perfil_padrao())

    async def test_soma_refeicoes_hidratacao_e_atividades_do_dia_e_semana(self):
        estimativa = EstimativaRefeicao(calorias=600, carboidratos_g=80, proteinas_g=25, gorduras_g=15, confianca="alta")
        with patch("resolvers.saude.agente_saude.estimar_macros_texto", new=AsyncMock(return_value=resultado_agente(estimativa))):
            await saude.registrar_refeicao_texto("almoco", "arroz, feijão e frango")

        saude.registrar_peso(79.8)
        saude.registrar_hidratacao(500)
        saude.registrar_atividade("corrida", 30, None)

        dash = saude.obter_dashboard()
        assert dash["peso_atual"] == 79.8
        assert dash["refeicoes_hoje"]["calorias"] == 600.0
        assert dash["hidratacao_hoje_ml"] == 500
        assert dash["atividades_na_semana"] == 1
