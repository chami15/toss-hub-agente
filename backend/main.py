"""Ponto de entrada da API (FastAPI).

Fatia atual: leitura (health, agentes, mensagens) + domínio do Financeiro
(upload de extrato, dashboard, relatório mensal) + domínio da Agenda
(mensagem roteada, gate de confirmação no Google Calendar) + domínio de
Saúde (perfil, peso, hidratação, sono, atividade, refeição, ficha de
treino, plano de dieta, relatório semanal). Motor de tick entra numa
próxima fatia. Sobe com:  uvicorn main:app --reload
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import agenda, agentes, financeiro, mensagens, saude
from utils.connection import close_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    close_pool()


app = FastAPI(title="Hub de Agentes — Backend", version="0.2.0", lifespan=lifespan)

# Libera o front local (Vite) a consumir a API durante o desenvolvimento.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agentes.router)
app.include_router(mensagens.router)
app.include_router(financeiro.router)
app.include_router(agenda.router)
app.include_router(saude.router)


@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok"}
