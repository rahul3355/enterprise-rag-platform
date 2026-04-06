import logging
import asyncio
from uuid import uuid4, UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from middleware.tenant import get_auth_user
from models.schemas import ChatRequest, ChatResponse, Citation
from services.supabase_client import (
    save_chat_session,
    save_chat_message,
    get_chat_history_for_session,
    get_tenant_chat_sessions,
    get_document_by_id,
)
from services.qdrant_client import (
    ensure_collection_exists,
    get_collection_name,
    search_vectors,
)
from services.neo4j_client import search_graph, ENABLE_NEO4J
from services.embedding_service import embed_text
from services.llm_client import generate_response, build_rag_prompt

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


def _safe_uuid(value: str) -> UUID:
    """Parse a UUID string safely, falling back to a random UUID."""
    try:
        return UUID(value)
    except (ValueError, AttributeError):
        return uuid4()


@router.post("/", response_model=ChatResponse)
async def chat_endpoint(body: ChatRequest, user=Depends(get_auth_user)):
    """Chat with multi-source RAG retrieval (Qdrant + ingestion pipeline)."""
    tenant_id = user.get("tenant_id")
    workspace_id = body.workspace_id
    user_id = user.get("user_id")
    message = body.message

    session_id = body.session_id or str(uuid4())

    # Try to create session (ignore if exists)
    try:
        await save_chat_session(session_id, tenant_id, workspace_id, user_id)
    except Exception:
        pass

    # Load conversation history
    history = await get_chat_history_for_session(session_id)
    recent_history = history[-10:] if history else []

    # Multi-source retrieval
    citations = []
    vector_context_text = ""
    graph_context_text = ""

    # Generate embedding once and reuse for all sources
    try:
        query_embedding = await embed_text(message)
    except Exception as exc:
        logger.error("Embedding generation failed: %s", exc)
        query_embedding = None

    if query_embedding:
        # Source 1: Vector search (Qdrant)
        try:
            collection_name = get_collection_name(tenant_id, workspace_id)
            await ensure_collection_exists(collection_name)
            vector_results = await search_vectors(
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                query_vector=query_embedding,
                limit=5,
            )
            if vector_results:
                vector_parts = []
                doc_ids = [
                    r.payload.get("document_id", "")
                    for r in vector_results
                    if r.payload.get("document_id")
                ]
                doc_records = {}
                if doc_ids:
                    fetch_tasks = [get_document_by_id(did) for did in doc_ids]
                    fetched = await asyncio.gather(*fetch_tasks, return_exceptions=True)
                    for did, rec in zip(doc_ids, fetched):
                        if not isinstance(rec, Exception):
                            doc_records[did] = rec

                for i, result in enumerate(vector_results):
                    content = result.payload.get("content", "")
                    doc_id = result.payload.get("document_id", "")
                    filename = result.payload.get("filename", "")
                    score = result.score
                    vector_parts.append(f"[V{i + 1}] {content}")

                    if doc_id:
                        doc_record = doc_records.get(doc_id)
                        citations.append(
                            Citation(
                                document_id=_safe_uuid(
                                    doc_record["id"] if doc_record else doc_id
                                ),
                                filename=doc_record.get("filename", filename)
                                if doc_record
                                else filename,
                                chunk_text=content[:500],
                                score=round(score, 4),
                            )
                        )
                vector_context_text = "\n".join(vector_parts)
        except Exception as exc:
            logger.warning("Vector search failed: %s", exc)

        # Source 2: Graph search (Neo4j) — gated by feature flag
        if ENABLE_NEO4J:
            try:
                graph_results = await search_graph(
                    query_text=message,
                    top_k=5,
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                )
                if graph_results:
                    graph_parts = []
                    for i, res in enumerate(graph_results):
                        chunk_text = res.get("text", "")
                        graph_parts.append(f"[G{i + 1}] {chunk_text}")
                    graph_context_text = "\n".join(graph_parts)
            except Exception as exc:
                logger.warning("Graph search failed: %s", exc)

    # Build prompt and generate response
    chat_history_str = "\n".join(
        f"{m.get('role', 'unknown')}: {m.get('content', '')}" for m in recent_history
    )
    prompt = build_rag_prompt(
        user_message=message,
        vector_context=vector_context_text,
        graph_context=graph_context_text,
        chat_history=chat_history_str,
    )

    response_data = await generate_response(prompt)

    # Save messages
    await save_chat_message(session_id, "user", message)
    await save_chat_message(
        session_id,
        "assistant",
        response_data["content"],
        citations=[c.model_dump(mode="json") for c in citations],
    )

    return ChatResponse(
        session_id=session_id,
        answer=response_data["content"],
        citations=citations,
        model=response_data.get("model", "unknown"),
    )


@router.get("/history")
async def get_chat_history(user=Depends(get_auth_user)):
    """Get chat sessions and messages for the tenant."""
    tenant_id = user.get("tenant_id")
    sessions = await get_tenant_chat_sessions(tenant_id)

    result = []
    for session in sessions:
        messages = await get_chat_history_for_session(session["id"])
        result.append(
            {
                "session_id": session["id"],
                "workspace_id": session.get("workspace_id", ""),
                "messages": messages,
                "created_at": session.get("created_at", ""),
                "updated_at": session.get("updated_at", ""),
            }
        )

    return {"sessions": result}
