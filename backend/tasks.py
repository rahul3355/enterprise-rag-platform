"""
Celery tasks for document ingestion.
Runs in background worker, not in HTTP request cycle.
"""

import logging

from celery_app import celery_app
from services.supabase_client import (
    get_document_by_id_sync,
    update_document_status_sync,
    download_file_from_storage,
)
from services.ingestion_pipeline import ingest_document_sync

logger = logging.getLogger(__name__)


@celery_app.task(
    name="tasks.process_document",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def process_document_task(self, document_id: str) -> dict:
    """Celery task: download file → parse → embed → store in Qdrant.

    This runs asynchronously in the Celery worker, not in the FastAPI process.
    """
    try:
        # Fetch document metadata from Supabase
        doc_record = get_document_by_id_sync(document_id)
        if not doc_record:
            raise ValueError(f"Document {document_id} not found in Supabase")

        storage_path = doc_record.get("storage_path")
        if not storage_path:
            raise ValueError(f"Document {document_id} has no storage_path")

        filename = doc_record.get("filename", "unknown")
        tenant_id = doc_record.get("tenant_id")
        workspace_id = doc_record.get("workspace_id")

        # Download file from Supabase Storage
        logger.info("Downloading %s from storage path %s", filename, storage_path)
        file_bytes = download_file_from_storage(storage_path)

        # Run the full ingestion pipeline (sync version for Celery)
        logger.info("Starting ingestion pipeline for %s", document_id)
        result = ingest_document_sync(
            document_id=document_id,
            file_bytes=file_bytes,
            filename=filename,
            tenant_id=tenant_id,
            workspace_id=workspace_id,
        )

        return result

    except Exception as exc:
        logger.error("Task failed for document %s: %s", document_id, exc, exc_info=True)
        try:
            update_document_status_sync(document_id, "failed")
        except Exception:
            pass
        raise self.retry(exc=exc, countdown=60 * (2**self.request.retries))
