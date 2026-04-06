"""
Document ingestion pipeline.
Coordinates Docling parsing → chunking → embedding → Qdrant storage.
Replaces the entire RAGFlow document pipeline.
"""

import asyncio
import logging
import uuid
from typing import Any

from services.docling_parser import parse_document, chunk_text
from services.embedding_service import embed_texts_batch
from services.qdrant_client import (
    ensure_collection_exists,
    get_collection_name,
    upsert_vectors,
    search_vectors,
)
from services.supabase_client import update_document_status

logger = logging.getLogger(__name__)


async def ingest_document(
    document_id: str,
    file_bytes: bytes,
    filename: str,
    tenant_id: str,
    workspace_id: str,
    chunk_size: int = 512,
    chunk_overlap: int = 50,
) -> dict[str, Any]:
    """Full ingestion pipeline: parse → chunk → embed → store in Qdrant.

    Returns:
        {
            "status": "ready" | "failed",
            "chunk_count": int,
            "page_count": int,
            "error": str | None,
        }
    """
    try:
        # Step 1: Parse document with Docling
        logger.info("Step 1: Parsing document with Docling...")
        parsed = await parse_document(file_bytes, filename)
        page_count = parsed["page_count"]
        logger.info("Parsed %d pages, %d tables", page_count, parsed["tables"])

        # Step 2: Chunk the text
        logger.info(
            "Step 2: Chunking text (size=%d, overlap=%d)...", chunk_size, chunk_overlap
        )
        chunks = chunk_text(
            parsed["text"], chunk_size=chunk_size, overlap=chunk_overlap
        )
        logger.info("Created %d chunks", len(chunks))

        # Step 3: Generate embeddings
        logger.info("Step 3: Generating embeddings via OpenRouter...")
        chunk_texts = [c["text"] for c in chunks]
        embeddings = await embed_texts_batch(chunk_texts)
        logger.info("Generated %d embeddings", len(embeddings))

        # Step 4: Store in Qdrant
        logger.info("Step 4: Storing vectors in Qdrant...")
        collection_name = get_collection_name(tenant_id, workspace_id)
        await ensure_collection_exists(collection_name)

        points = []
        for i, (chunk_info, embedding) in enumerate(zip(chunks, embeddings)):
            point_id = str(uuid.uuid5(uuid.UUID(document_id), f"chunk_{i}"))
            points.append(
                {
                    "id": point_id,
                    "vector": embedding,
                    "payload": {
                        "document_id": document_id,
                        "workspace_id": workspace_id,
                        "tenant_id": tenant_id,
                        "chunk_index": i,
                        "content": chunk_info["text"],
                        "filename": filename,
                        "page": chunk_info["page"],
                    },
                }
            )

        await upsert_vectors(tenant_id, workspace_id, points)
        logger.info(
            "Stored %d vectors in Qdrant collection '%s'", len(points), collection_name
        )

        # Step 5: Update Supabase status
        await update_document_status(document_id, "ready", chunk_count=len(chunks))

        return {
            "status": "ready",
            "chunk_count": len(chunks),
            "page_count": page_count,
            "error": None,
        }

    except Exception as exc:
        logger.error(
            "Document ingestion failed for %s: %s", document_id, exc, exc_info=True
        )
        await update_document_status(document_id, "failed")
        return {
            "status": "failed",
            "chunk_count": 0,
            "page_count": 0,
            "error": str(exc),
        }


async def search_documents(
    tenant_id: str,
    workspace_id: str,
    query: str,
    query_embedding: list[float],
    top_k: int = 5,
) -> list[dict[str, Any]]:
    """Search documents in Qdrant using a pre-computed query embedding."""
    results = await search_vectors(
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        query_vector=query_embedding,
        limit=top_k,
    )

    return [
        {
            "content": r.payload.get("content", ""),
            "document_id": r.payload.get("document_id", ""),
            "filename": r.payload.get("filename", ""),
            "chunk_index": r.payload.get("chunk_index", 0),
            "score": r.score,
        }
        for r in results
    ]


def ingest_document_sync(
    document_id: str,
    file_bytes: bytes,
    filename: str,
    tenant_id: str,
    workspace_id: str,
    chunk_size: int = 512,
    chunk_overlap: int = 50,
) -> dict[str, Any]:
    """Synchronous wrapper for Celery tasks. Runs async pipeline via asyncio.run()."""
    return asyncio.run(
        ingest_document(
            document_id=document_id,
            file_bytes=file_bytes,
            filename=filename,
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )
    )
