"""Testes do domínio Agenda: TTL de pendência esquecida, consulta
determinística de pendência aberta, fechamento de pendência órfã ao
continuar negociação, e o roteamento de processar_mensagem."""
from datetime import timedelta
from unittest.mock import AsyncMock, patch

import pytest

import resolvers.agenda as agenda
from utils.query_executor import executar_query


class FakeDecisao:
    def __init__(self, tipo, mensagem, acao=None, payload=None):
        self.tipo = tipo
        self.mensagem = mensagem
        self.acao = acao
        self.payload = payload


class TestConsultaDePendencia:
    def test_sem_nenhuma_pendencia(self, agente_agenda_id):
        resultado = agenda._responder_pendencia_atual(agente_agenda_id)
        assert resultado["acao_pendente_id"] is None
        assert "não tem nenhuma pendência" in resultado["mensagem"]

    def test_com_pendencia_aguardando_info(self, agente_agenda_id):
        executar_query(
            "acoes_pendentes:inserir",
            returning=True,
            params=(agente_agenda_id, "aguardando_info", "Qual dia?", '{"pedido_original": "marcar jantar"}'),
        )
        resultado = agenda._responder_pendencia_atual(agente_agenda_id)
        assert resultado["aguardando_confirmacao"] is False
        assert "esperando você responder" in resultado["mensagem"]

    def test_com_proposta_aguardando_confirmacao(self, agente_agenda_id):
        executar_query(
            "acoes_pendentes:inserir",
            returning=True,
            params=(agente_agenda_id, "criar_evento", "Jantar sábado 20h. Confirma?", '{"pedido_original": "x"}'),
        )
        resultado = agenda._responder_pendencia_atual(agente_agenda_id)
        assert resultado["aguardando_confirmacao"] is True

    async def test_consulta_e_respondida_mesmo_com_pendencia_aberta(self, agente_agenda_id):
        executar_query(
            "acoes_pendentes:inserir",
            returning=True,
            params=(agente_agenda_id, "criar_evento", "Jantar sábado 20h. Confirma?", '{"pedido_original": "x"}'),
        )
        resultado = await agenda.processar_mensagem("qual pendência em aberto?")
        assert resultado["aguardando_confirmacao"] is True


class TestTTLDePendencia:
    def test_pendencia_expira_sozinha_apos_ttl(self, agente_agenda_id):
        rows = executar_query(
            "acoes_pendentes:inserir",
            returning=True,
            params=(agente_agenda_id, "aguardando_info", "Qual dia?", '{"pedido_original": "x"}'),
        )
        pendente_id = rows[0]["id"]

        # força o criado_em pra fora do TTL
        from utils.db import Database
        with Database() as conn:
            conn.execute(
                "UPDATE acoes_pendentes SET criado_em = now() - interval '999 minutes' WHERE id = %s",
                (pendente_id,),
            )
            conn.commit()

        assert agenda._pendente_aberta(agente_agenda_id) is None

        status = executar_query("acoes_pendentes:buscar_por_id", params=(pendente_id,))[0]["status"]
        assert status == "expirado"


class TestFluxoDeNegociacao:
    async def test_resposta_livre_fecha_pendencia_anterior_antes_de_abrir_a_proxima(self, agente_agenda_id):
        with patch("resolvers.agenda.decidir", new=AsyncMock(return_value=FakeDecisao("pergunta", "Qual dia?"))):
            primeira = await agenda.processar_mensagem("quero marcar um jantar")
        primeiro_id = primeira["acao_pendente_id"]

        nova_decisao = FakeDecisao(
            "proposta", "Jantar sábado 20h. Confirma?", acao="criar_evento",
            payload={"titulo": "Jantar", "inicio_iso": "2026-01-01T20:00:00", "fim_iso": "2026-01-01T22:00:00"},
        )
        with patch("resolvers.agenda.decidir", new=AsyncMock(return_value=nova_decisao)):
            segunda = await agenda.processar_mensagem("sábado")

        status_primeira = executar_query("acoes_pendentes:buscar_por_id", params=(primeiro_id,))[0]["status"]
        assert status_primeira == "expirado"
        assert segunda["aguardando_confirmacao"] is True

    async def test_confirmar_dispara_acao_real_e_fecha_pendencia(self, agente_agenda_id):
        decisao = FakeDecisao(
            "proposta", "Jantar sábado 20h. Confirma?", acao="criar_evento",
            payload={"titulo": "Jantar", "inicio_iso": "2026-01-01T20:00:00", "fim_iso": "2026-01-01T22:00:00"},
        )
        with patch("resolvers.agenda.decidir", new=AsyncMock(return_value=decisao)):
            proposta = await agenda.processar_mensagem("quero marcar um jantar sábado")

        with patch("resolvers.agenda.google_calendar.criar_evento_real", return_value={"id": "evt123"}):
            resultado = await agenda.processar_mensagem("sim")

        assert resultado["resultado"] == {"id": "evt123"}
        status = executar_query("acoes_pendentes:buscar_por_id", params=(proposta["acao_pendente_id"],))[0]["status"]
        assert status == "confirmado"

    async def test_consulta_direta_nao_chama_llm(self, agente_agenda_id):
        mock_decidir = AsyncMock()
        with patch("resolvers.agenda.decidir", mock_decidir), \
             patch("resolvers.agenda.google_calendar.listar_eventos", return_value=[]), \
             patch("resolvers.agenda.google_calendar.resumir_eventos", return_value=[]):
            resultado = await agenda.processar_mensagem("quais eventos eu tenho essa semana")
        assert mock_decidir.call_count == 0
        assert "não tem nenhum compromisso" in resultado["mensagem"]
