"""Ponto de entrada da API (FastAPI).

Fatia atual: só leitura (health, agentes, mensagens). O motor de tick e o
LLM entram na próxima fatia. Sobe com:  uvicorn app.main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import routes_agents, routes_mensagens

app = FastAPI(title="Hub de Agentes — Backend", version="0.1.0")

# Libera o front local (Vite) a consumir a API durante o desenvolvimento.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_agents.router)
app.include_router(routes_mensagens.router)


@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok"}
