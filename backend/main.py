import os
from typing import Any

import redis.asyncio as redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

from middleware.tenant import tenant_middleware
from routers import auth, documents, chat, workspaces
from services.qdrant_client import health_check as qdrant_health
from services.neo4j_client import health_check as neo4j_health, ENABLE_NEO4J
from services.embedding_service import health_check as embedding_health
from services.supabase_client import get_supabase_client

ROOT_ENV = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ROOT_ENV)

REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")

app = FastAPI(title="Enterprise RAG Backend")

cors_origins = os.getenv(
    "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(tenant_middleware)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(workspaces.router)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "message": "Enterprise RAG Backend Running",
        "environment": os.getenv("ENVIRONMENT", "development"),
    }


@app.get("/health")
async def health() -> dict[str, Any]:
    results: dict[str, Any] = {
        "backend": "ok",
    }

    try:
        r = redis.from_url(REDIS_URL)
        await r.ping()
        await r.aclose()
        results["redis"] = {"service": "redis", "status": "ok"}
    except Exception as exc:
        results["redis"] = {"service": "redis", "status": "error", "details": str(exc)}

    try:
        q_ok = await qdrant_health()
        results["qdrant"] = {"service": "qdrant", "status": "ok" if q_ok else "error"}
    except Exception as exc:
        results["qdrant"] = {
            "service": "qdrant",
            "status": "error",
            "details": str(exc),
        }

    if ENABLE_NEO4J:
        try:
            n_ok = await neo4j_health()
            results["neo4j"] = {"service": "neo4j", "status": "ok" if n_ok else "error"}
        except Exception as exc:
            results["neo4j"] = {
                "service": "neo4j",
                "status": "error",
                "details": str(exc),
            }
    else:
        results["neo4j"] = {"service": "neo4j", "status": "disabled"}

    try:
        supabase_client = get_supabase_client()
        supabase_client.table("documents").select("id").limit(1).execute()
        results["supabase"] = {"service": "supabase", "status": "ok"}
    except Exception as exc:
        results["supabase"] = {
            "service": "supabase",
            "status": "error",
            "details": str(exc),
        }

    try:
        e_ok = await embedding_health()
        results["embedding"] = {
            "service": "openrouter-embedding",
            "status": "ok" if e_ok else "error",
        }
    except Exception as exc:
        results["embedding"] = {
            "service": "openrouter-embedding",
            "status": "error",
            "details": str(exc),
        }

    return results
