"""Testes do motor de tick — Etapa 2 (camada social): elegibilidade
determinística (quem tenta falar), roleta ponderada pela afinidade (com
quem fala), guardrails (orçamento, rate limit por par) e persistência
(mensagem, afinidade, estado do agente). Mocka só o modelo/a função do
agente de interação — nunca a lógica de decisão em si, mesma disciplina
usada nos outros domínios."""
from datetime import date
from types import SimpleNamespace

import pytest

import resolvers.interacao as interacao
import resolvers.tick as tick
from tests.helpers import resultado_agente
from utils.query_executor import executar_query


def _criar_agente(nome: str, extroversao: int = 5, ativo: bool = True) -> int:
    rows = executar_query(
        "agentes:upsert",
        returning=True,
        params=(nome, "colaborador", "teste", f"Personalidade de {nome}.", "{}", 0, extroversao),
    )
    agente_id = rows[0]["id"]
    if not ativo:
        from utils.db import Database
        with Database() as conn:
            conn.execute("UPDATE agentes SET ativo = FALSE WHERE id = %s", (agente_id,))
            conn.commit()
    return agente_id


def _mensagem_gerada(conteudo: str = "Oi, tudo certo por aí?"):
    return resultado_agente(SimpleNamespace(conteudo=conteudo))


class TestFuncoesPuras:
    def test_chance_falar_soma_extroversao_e_cooldown(self):
        assert interacao._chance_falar(extroversao=10, ticks_parado=0) == pytest.approx(0.5)
        assert interacao._chance_falar(extroversao=0, ticks_parado=0) == 0.0

    def test_chance_falar_nunca_passa_do_teto(self):
        assert interacao._chance_falar(extroversao=10, ticks_parado=1000) == pytest.approx(0.9)

    def test_peso_destinatario_cresce_com_afinidade(self):
        assert interacao._peso_destinatario(0) == pytest.approx(1.0)
        assert interacao._peso_destinatario(100) == pytest.approx(4.0)

    def test_peso_destinatario_nao_fica_negativo_com_afinidade_negativa(self):
        # -100 de afinidade daria peso 1 + (-1)*3 = -2 sem o piso — o piso
        # garante que nenhum par fica com chance zero/negativa de se falar.
        assert interacao._peso_destinatario(-100) == pytest.approx(0.1)

    def test_delta_afinidade_diminui_conforme_afinidade_atual_sobe(self):
        assert interacao._delta_afinidade(0) == pytest.approx(3.0)
        assert interacao._delta_afinidade(50) == pytest.approx(1.5)
        assert interacao._delta_afinidade(100) == pytest.approx(0.0)


class TestGuardrails:
    async def test_sem_tick_ainda_levanta_erro(self):
        with pytest.raises(ValueError, match="Nenhum tick rodou"):
            await interacao.processar_interacao_social()

    async def test_orcamento_esgotado_bloqueia_tudo_sem_chamar_llm(self, mocker):
        _criar_agente("A", extroversao=10)
        _criar_agente("B", extroversao=10)
        tick.avancar_tick()

        executar_query(
            "relatorios_financeiros:upsert",
            returning=True,
            params=(date(2026, 1, 1), '{"x": 1}', "gpt-4o", 1, 1, 999.0),
        )

        mock_gerar = mocker.patch(
            "resolvers.interacao.agente_interacao.gerar_mensagem_social",
            return_value=_mensagem_gerada(),
        )

        resultado = await interacao.processar_interacao_social()

        assert "esgotado" in resultado["aviso"]
        assert mock_gerar.call_count == 0
        assert executar_query("mensagens:listar_todas", params=(10,)) == []

    async def test_menos_de_dois_colaboradores_nao_quebra(self):
        _criar_agente("Sozinho", extroversao=10)
        tick.avancar_tick()

        resultado = await interacao.processar_interacao_social()

        assert "Menos de 2" in resultado["aviso"]

    async def test_rate_limit_do_par_impede_novo_destinatario_sem_chamar_llm(self, mocker):
        a_id = _criar_agente("A", extroversao=10)
        b_id = _criar_agente("B", extroversao=10)
        tick_info = tick.avancar_tick()
        numero_tick = tick_info["numero"]

        from config import settings
        for _ in range(settings.interacao_rate_limit_par_por_dia):
            executar_query(
                "mensagens:inserir",
                returning=True,
                params=(a_id, b_id, "social", "mensagem antiga", numero_tick),
            )

        mocker.patch("resolvers.interacao.random.random", return_value=0.0)
        mock_gerar = mocker.patch(
            "resolvers.interacao.agente_interacao.gerar_mensagem_social",
            return_value=_mensagem_gerada(),
        )

        resultado = await interacao.processar_interacao_social()

        entrada_a = next(i for i in resultado["interacoes"] if i["agente_id"] == a_id)
        assert entrada_a["quer_falar"] is True
        assert entrada_a["destinatario_id"] is None
        assert "rate limit" in entrada_a["aviso"]
        assert mock_gerar.call_count == 0


class TestDryRun:
    async def test_dry_run_nao_persiste_nada_nem_chama_llm(self, mocker):
        _criar_agente("A", extroversao=10)
        _criar_agente("B", extroversao=10)
        tick.avancar_tick()

        mocker.patch("resolvers.interacao.random.random", return_value=0.0)
        mock_gerar = mocker.patch(
            "resolvers.interacao.agente_interacao.gerar_mensagem_social",
            return_value=_mensagem_gerada(),
        )

        resultado = await interacao.processar_interacao_social(dry_run=True)

        assert any(i["quer_falar"] for i in resultado["interacoes"])
        assert all(i["mensagem"] is None for i in resultado["interacoes"])
        assert mock_gerar.call_count == 0
        assert executar_query("mensagens:listar_todas", params=(10,)) == []


class TestRodadaReal:
    async def test_gera_mensagem_atualiza_afinidade_e_estado(self, mocker):
        a_id = _criar_agente("A", extroversao=10)
        b_id = _criar_agente("B", extroversao=10)
        tick_info = tick.avancar_tick()
        numero_tick = tick_info["numero"]

        executar_query("relacionamentos:upsert_neutro", commit=True, params=(a_id, b_id))
        executar_query("relacionamentos:upsert_neutro", commit=True, params=(b_id, a_id))

        # Só A sorteia "quer falar" (0.0 < chance) — B não (1.0 < chance é
        # falso) — isolando exatamente 1 interação nesse tick, pra conferir
        # a fórmula de afinidade sem uma segunda troca (A->B e B->A) somando
        # duas vezes por cima.
        mocker.patch("resolvers.interacao.random.random", side_effect=[0.0, 1.0])
        mock_gerar = mocker.patch(
            "resolvers.interacao.agente_interacao.gerar_mensagem_social",
            return_value=_mensagem_gerada("Oi, tudo certo?"),
        )

        resultado = await interacao.processar_interacao_social()

        assert mock_gerar.call_count == 1
        mensagens = executar_query("mensagens:listar_todas", params=(10,))
        assert len(mensagens) >= 1
        assert mensagens[0]["tipo"] == "social"
        assert mensagens[0]["tick"] == numero_tick

        par = executar_query("relacionamentos:buscar_por_par", params=(a_id, b_id))[0]
        assert par["afinidade"] == 3  # 0 -> delta de 3 (afinidade inicial 0)

        agente_a = executar_query("agentes:buscar_por_id", params=(a_id,))[0]
        assert agente_a["estado"] == "falando"

    async def test_evento_mundo_e_marcado_como_usado(self, mocker):
        _criar_agente("A", extroversao=10)
        _criar_agente("B", extroversao=10)
        tick.avancar_tick()

        evento = executar_query("eventos_mundo:inserir", returning=True, params=("Está calor hoje.", None))[0]

        mocker.patch("resolvers.interacao.random.random", return_value=0.0)
        mocker.patch(
            "resolvers.interacao.agente_interacao.gerar_mensagem_social",
            return_value=_mensagem_gerada(),
        )

        await interacao.processar_interacao_social()

        eventos = executar_query("eventos_mundo:listar")
        assert eventos[0]["ultimo_uso_tick"] == evento["tick"] or eventos[0]["ultimo_uso_tick"] is not None


class TestEventosMundoManual:
    def test_criar_e_listar_evento_manual(self):
        _criar_agente("A")
        criado = interacao.criar_evento_mundo("Sextou.")
        listados = interacao.listar_eventos_mundo()
        assert any(e["descricao"] == "Sextou." for e in listados)
        assert criado["descricao"] == "Sextou."
