"""
Embedding service using OpenAI SDK via OpenRouter.
Generates vector embeddings for text chunks using openai/text-embedding-3-small.
"""

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from openai import AsyncOpenAI

ROOT_ENV = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(ROOT_ENV)

OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
EMBEDDING_MODEL: str = "openai/text-embedding-3-small"
EMBEDDING_DIM: int = 1536

_client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
            default_headers={
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Enterprise RAG",
            },
        )
    return _client


async def embed_text(text: str) -> list[float]:
    """Generate embedding for a single text string."""
    client = get_openai_client()
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
        encoding_format="float",
    )
    return response.data[0].embedding


async def embed_texts_batch(
    texts: list[str], batch_size: int = 100
) -> list[list[float]]:
    """Generate embeddings for a list of texts in batches."""
    all_embeddings = []
    client = get_openai_client()

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = await client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=batch,
            encoding_format="float",
        )
        batch_embeddings = [item.embedding for item in response.data]
        all_embeddings.extend(batch_embeddings)

    return all_embeddings


async def health_check() -> bool:
    """Verify the embedding API key works."""
    try:
        client = get_openai_client()
        response = await client.embeddings.create(
            model=EMBEDDING_MODEL,
            input="test",
            encoding_format="float",
        )
        return response.data is not None and len(response.data) > 0
    except Exception:
        return False
