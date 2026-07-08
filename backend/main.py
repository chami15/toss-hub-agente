"""Ponto de entrada da API (FastAPI).

Fatia atual: leitura (health, agentes, mensagens), agora sobre o padrão
utils/sql/resolvers/routers. Motor de tick e agentes LLM entram nas
próximas fatias. Sobe com:  uvicorn main:app --reload
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import agentes, mensagens
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


@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok"}
