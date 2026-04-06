import logging
import time
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel

from middleware.tenant import get_auth_user
from models.schemas import (
    DocumentUploadResponse,
    DocumentResponse,
    DocumentListResponse,
)
from services.supabase_client import (
    insert_document_record,
    update_document_status,
    get_tenant_documents,
    upload_file_to_storage,
)
from services.ingestion_pipeline import ingest_document

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt", ".csv", ".md", ".xlsx"}
ALLOWED_MIMETYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/markdown",
    "text/csv",
}


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    status: str
    workspace_id: str
    uploaded_at: str


@router.post("/upload", response_model=UploadResponse)
async def upload_document_endpoint(
    file: UploadFile,
    workspace_id: str,
    user=Depends(get_auth_user),
):
    """Upload a document, parse it, embed chunks, and store in Qdrant.

    Pipeline:
    1. Read file bytes
    2. Upload to Supabase Storage
    3. Insert document record in Supabase
    4. Parse with Docling
    5. Generate embeddings via OpenRouter
    6. Store vectors in Qdrant
    7. Update status to 'ready' or 'failed'
    """
    tenant_id = user.get("tenant_id")
    user_id = user.get("user_id")

    # Validate file type
    ext = ""
    if file.filename:
        ext = "." + file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    if file.content_type and file.content_type not in ALLOWED_MIMETYPES:
        logger.warning("Unexpected MIME type: %s", file.content_type)

    # Read file
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")

    document_id = str(uuid4())
    storage_path = f"{tenant_id}/{workspace_id}/{document_id}_{file.filename}"

    try:
        # Step 1: Upload to Supabase Storage
        logger.info("Step 1: Uploading to Supabase Storage...")
        await upload_file_to_storage(
            file_bytes, storage_path, file.content_type or "application/pdf"
        )

        # Step 2: Insert document record
        logger.info("Step 2: Inserting document record...")
        await insert_document_record(
            document_id=document_id,
            filename=file.filename,
            file_size=len(file_bytes),
            content_type=file.content_type or "application/pdf",
            workspace_id=workspace_id,
            tenant_id=tenant_id,
            user_id=user_id,
            storage_path=storage_path,
        )

        # Step 3: Run the full ingestion pipeline (parse → embed → store)
        logger.info("Step 3: Running ingestion pipeline...")
        result = await ingest_document(
            document_id=document_id,
            file_bytes=file_bytes,
            filename=file.filename,
            tenant_id=tenant_id,
            workspace_id=workspace_id,
        )

        logger.info("Document ingestion %s: %s", document_id, result["status"])

        return UploadResponse(
            document_id=document_id,
            filename=file.filename,
            status=result["status"],
            workspace_id=workspace_id,
            uploaded_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        )

    except Exception as exc:
        logger.error("Upload failed for %s: %s", file.filename, exc, exc_info=True)
        try:
            await update_document_status(document_id, "failed")
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    workspace_id: Optional[str] = None,
    user=Depends(get_auth_user),
):
    """List all documents for the tenant."""
    tenant_id = user.get("tenant_id")
    docs = await get_tenant_documents(tenant_id)

    if workspace_id:
        docs = [d for d in docs if d.get("workspace_id") == workspace_id]

    return DocumentListResponse(
        documents=[
            DocumentResponse(
                id=d["id"],
                filename=d.get("filename", ""),
                workspace_id=d.get("workspace_id", ""),
                tenant_id=d.get("tenant_id", ""),
                status=d.get("status", "unknown"),
                chunk_count=d.get("chunk_count", 0),
                file_size=d.get("file_size", 0),
                uploaded_at=d.get("uploaded_at", ""),
                updated_at=d.get("updated_at", ""),
            )
            for d in docs
        ]
    )
