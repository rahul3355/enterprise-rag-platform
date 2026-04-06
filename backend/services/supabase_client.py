import os
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from supabase import create_client, Client

ROOT_ENV = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(ROOT_ENV)

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_JWT_SECRET: str = os.getenv("JWT_SECRET", "")

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_client


async def ensure_tenant_exists(user_id: str) -> str:
    from uuid import uuid4
    import logging

    client = get_supabase_client()
    tenant_id = str(uuid4())
    try:
        row = {
            "id": tenant_id,
            "name": "My Organization",
            "description": "Auto-created tenant",
        }
        result = client.table("tenants").insert(row).execute()
        if result.data:
            logging.getLogger(__name__).info(
                f"Created new tenant: {tenant_id} for user: {user_id}"
            )
            return result.data[0].get("id", tenant_id)
    except Exception as e:
        logging.getLogger(__name__).warning(f"Could not create tenant record: {e}")
    return tenant_id


async def get_user_tenant_id(user_id: str) -> str:
    """Get tenant_id for user, create one if doesn't exist"""
    import logging

    client = get_supabase_client()

    # Try to find existing tenant for this user
    # Check if there's a tenant record (you might need to add user_id to tenants table)
    # For now, create a new tenant
    try:
        result = client.table("tenants").select("id").limit(1).execute()
        if result.data and len(result.data) > 0:
            # Use existing tenant
            tenant_id = result.data[0]["id"]
            logging.getLogger(__name__).info(f"Found existing tenant: {tenant_id}")
            return tenant_id
    except Exception as e:
        logging.getLogger(__name__).warning(f"Error fetching tenant: {e}")

    # Create new tenant
    return await ensure_tenant_exists(user_id)


async def verify_supabase_jwt(token: str) -> dict[str, Any]:
    client = get_supabase_client()
    user = client.auth.get_user(token)
    if user is None or user.user is None:
        raise ValueError("Invalid token")
    return {
        "user_id": str(user.user.id),
        "email": user.user.email,
        "app_metadata": user.user.app_metadata,
        "user_metadata": user.user.user_metadata,
    }


async def get_user_workspaces(tenant_id: str, user_id: str) -> list[str]:
    client = get_supabase_client()
    result = (
        client.table("workspaces").select("id").eq("tenant_id", tenant_id).execute()
    )
    return [row["id"] for row in result.data] if result.data else []


async def insert_document_record(
    document_id: str,
    filename: str,
    file_size: int,
    content_type: str,
    workspace_id: str,
    tenant_id: str,
    user_id: str,
    storage_path: str,
) -> dict[str, Any]:
    import logging

    logger = logging.getLogger(__name__)

    logger.info(
        "insert_document_record called: doc=%s, workspace=%s, tenant=%s",
        document_id,
        workspace_id,
        tenant_id,
    )

    client = get_supabase_client()
    row = {
        "id": document_id,
        "filename": filename,
        "file_size": file_size,
        "content_type": content_type,
        "workspace_id": workspace_id,
        "tenant_id": tenant_id,
        "user_id": user_id,
        "storage_path": storage_path,
        "status": "uploading",
        "chunk_count": 0,
    }
    logger.info("Inserting row: %s", row)
    try:
        result = client.table("documents").insert(row).execute()
        logger.info("Insert SUCCESS, result: %s", result.data)
        return result.data[0] if result.data else {}
    except Exception as e:
        logger.error("Insert FAILED: %s", str(e), exc_info=True)
        raise


async def update_document_status(
    document_id: str, status: str, chunk_count: int = 0
) -> dict[str, Any]:
    client = get_supabase_client()
    result = (
        client.table("documents")
        .update({"status": status, "chunk_count": chunk_count})
        .eq("id", document_id)
        .execute()
    )
    return result.data[0] if result.data else {}


async def get_tenant_documents(tenant_id: str) -> list[dict[str, Any]]:
    client = get_supabase_client()
    result = (
        client.table("documents")
        .select("*")
        .eq("tenant_id", tenant_id)
        .order("uploaded_at", desc=True)
        .execute()
    )
    return result.data if result.data else []


async def update_document_ragflow_id(
    document_id: str, ragflow_doc_id: str
) -> dict[str, Any]:
    client = get_supabase_client()
    result = (
        client.table("documents")
        .update({"external_ragflow_doc_id": ragflow_doc_id})
        .eq("id", document_id)
        .execute()
    )
    return result.data[0] if result.data else {}


async def get_document_by_ragflow_id(
    ragflow_doc_id: str,
) -> Optional[dict[str, Any]]:
    client = get_supabase_client()
    result = (
        client.table("documents")
        .select("*")
        .eq("external_ragflow_doc_id", ragflow_doc_id)
        .execute()
    )
    return result.data[0] if result.data else None


async def get_document_by_id(document_id: str) -> Optional[dict[str, Any]]:
    client = get_supabase_client()
    result = client.table("documents").select("*").eq("id", document_id).execute()
    return result.data[0] if result.data else None


async def upload_file_to_storage(
    file_bytes: bytes, storage_path: str, content_type: str
) -> str:
    import logging

    logger = logging.getLogger(__name__)

    logger.info(
        "upload_file_to_storage called: path=%s, size=%d, content_type=%s",
        storage_path,
        len(file_bytes),
        content_type,
    )

    client = get_supabase_client()
    try:
        client.storage.from_("documents").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": content_type},
        )
        logger.info("Storage upload SUCCESS")
        return storage_path
    except Exception as e:
        logger.error("Storage upload FAILED: %s", str(e), exc_info=True)
        raise


async def create_workspace_record(
    workspace_id: str,
    name: str,
    description: Optional[str],
    tenant_id: str,
) -> dict[str, Any]:
    client = get_supabase_client()
    row = {
        "id": workspace_id,
        "name": name,
        "description": description,
        "tenant_id": tenant_id,
    }
    result = client.table("workspaces").insert(row).execute()
    return result.data[0] if result.data else {}


async def get_tenant_workspaces(tenant_id: str) -> list[dict[str, Any]]:
    client = get_supabase_client()
    result = (
        client.table("workspaces")
        .select("*")
        .eq("tenant_id", tenant_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data if result.data else []


async def save_chat_session(
    session_id: str,
    tenant_id: str,
    workspace_id: str,
    user_id: str,
) -> dict[str, Any]:
    client = get_supabase_client()
    row = {
        "id": session_id,
        "tenant_id": tenant_id,
        "workspace_id": workspace_id,
        "user_id": user_id,
    }
    result = client.table("chat_sessions").insert(row).execute()
    return result.data[0] if result.data else {}


async def save_chat_message(
    session_id: str,
    role: str,
    content: str,
    citations: Optional[list[dict[str, Any]]] = None,
) -> dict[str, Any]:
    client = get_supabase_client()
    row: dict[str, Any] = {
        "session_id": session_id,
        "role": role,
        "content": content,
    }
    if citations:
        row["citations"] = citations
    result = client.table("chat_messages").insert(row).execute()
    return result.data[0] if result.data else {}


async def get_chat_history_for_session(session_id: str) -> list[dict[str, Any]]:
    client = get_supabase_client()
    result = (
        client.table("chat_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data if result.data else []


async def get_tenant_chat_sessions(
    tenant_id: str, workspace_id: Optional[str] = None
) -> list[dict[str, Any]]:
    client = get_supabase_client()
    query = (
        client.table("chat_sessions")
        .select("*")
        .eq("tenant_id", tenant_id)
        .order("updated_at", desc=True)
    )
    if workspace_id:
        query = query.eq("workspace_id", workspace_id)
    result = query.execute()
    return result.data if result.data else []


def download_file_from_storage(storage_path: str) -> bytes:
    """Download file bytes from Supabase Storage (sync, for Celery tasks)."""
    client = get_supabase_client()
    return client.storage.from_("documents").download(storage_path)


def get_document_by_id_sync(document_id: str) -> Optional[dict[str, Any]]:
    """Sync version for Celery tasks. Supabase SDK is sync internally anyway."""
    client = get_supabase_client()
    result = client.table("documents").select("*").eq("id", document_id).execute()
    return result.data[0] if result.data else None


def update_document_status_sync(
    document_id: str, status: str, chunk_count: int = 0
) -> dict[str, Any]:
    """Sync version for Celery tasks."""
    client = get_supabase_client()
    result = (
        client.table("documents")
        .update({"status": status, "chunk_count": chunk_count})
        .eq("id", document_id)
        .execute()
    )
    return result.data[0] if result.data else {}
