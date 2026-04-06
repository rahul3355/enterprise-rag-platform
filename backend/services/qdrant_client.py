import os
from typing import Any, Optional

from dotenv import load_dotenv
from pathlib import Path
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)

ROOT_ENV = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(ROOT_ENV)

QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY: Optional[str] = os.getenv("QDRANT_API_KEY") or None

_qdrant_client: Optional[AsyncQdrantClient] = None


def get_qdrant_client() -> AsyncQdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = AsyncQdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY,
            timeout=60,
        )
    return _qdrant_client


async def ensure_collection_exists(
    collection_name: str, vector_size: int = 1536
) -> None:
    client = get_qdrant_client()
    exists = await client.collection_exists(collection_name=collection_name)
    if not exists:
        await client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )


def get_collection_name(tenant_id: str, workspace_id: str) -> str:
    return f"tenant_{tenant_id}_workspace_{workspace_id}"


async def upsert_vectors(
    tenant_id: str,
    workspace_id: str,
    points: list[dict],
) -> None:
    """Upsert points into Qdrant collection.

    Args:
        tenant_id: Tenant UUID
        workspace_id: Workspace UUID
        points: List of dicts with keys: id (str UUID), vector (list[float]), payload (dict)
    """
    client = get_qdrant_client()
    collection_name = get_collection_name(tenant_id, workspace_id)
    await ensure_collection_exists(collection_name)

    point_structs = [
        PointStruct(
            id=p["id"],
            vector=p["vector"],
            payload=p.get("payload", {}),
        )
        for p in points
    ]
    await client.upsert(collection_name=collection_name, points=point_structs)


async def search_vectors(
    tenant_id: str,
    workspace_id: str,
    query_vector: list[float],
    limit: int = 5,
) -> list[Any]:
    client = get_qdrant_client()
    collection_name = get_collection_name(tenant_id, workspace_id)
    collection_exists = await client.collection_exists(collection_name=collection_name)
    if not collection_exists:
        return []
    response = await client.query_points(
        collection_name=collection_name,
        query=query_vector,
        limit=limit,
    )
    return response.points


async def search_vectors_with_filter(
    tenant_id: str,
    workspace_id: str,
    query_vector: list[float],
    document_ids: Optional[list[str]] = None,
    limit: int = 5,
) -> list[Any]:
    client = get_qdrant_client()
    collection_name = get_collection_name(tenant_id, workspace_id)
    collection_exists = await client.collection_exists(collection_name=collection_name)
    if not collection_exists:
        return []

    query_filter: Optional[Filter] = None
    if document_ids:
        query_filter = Filter(
            must=[
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=doc_id),
                )
                for doc_id in document_ids
            ]
        )

    response = await client.query_points(
        collection_name=collection_name,
        query=query_vector,
        query_filter=query_filter,
        limit=limit,
    )
    return response.points


async def delete_collection(tenant_id: str, workspace_id: str) -> None:
    client = get_qdrant_client()
    collection_name = get_collection_name(tenant_id, workspace_id)
    exists = await client.collection_exists(collection_name=collection_name)
    if exists:
        await client.delete_collection(collection_name=collection_name)


async def health_check() -> bool:
    try:
        client = get_qdrant_client()
        await client.get_collections()
        return True
    except Exception:
        return False
