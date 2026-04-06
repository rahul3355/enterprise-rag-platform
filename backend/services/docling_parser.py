"""
Document parsing service using Docling (IBM).
Replaces RAGFlow's DeepDoc engine for local, high-quality document parsing.
"""

import asyncio
import io
import logging
from typing import Any

from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat, DocumentStream
from docling.datamodel.pipeline_options import PdfPipelineOptions

logger = logging.getLogger(__name__)

_converter: DocumentConverter | None = None


def _get_converter() -> DocumentConverter:
    """Lazy-initialized singleton Docling converter."""
    global _converter
    if _converter is None:
        pipeline_options = PdfPipelineOptions(
            do_ocr=False,
            do_table_structure=True,
        )
        _converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(
                    pipeline_options=pipeline_options,
                ),
            }
        )
    return _converter


def _parse_sync(file_bytes: bytes, filename: str) -> dict[str, Any]:
    """Synchronous document parsing (runs in thread pool)."""
    converter = _get_converter()
    source = DocumentStream(name=filename, stream=io.BytesIO(file_bytes))

    result = converter.convert(source)
    doc = result.document

    full_text = doc.export_to_markdown()

    table_count = sum(
        len(page.tables) if hasattr(page, "tables") else 0
        for page in doc.pages.values()
    )

    return {
        "text": full_text,
        "page_count": len(doc.pages),
        "tables": table_count,
    }


async def parse_document(file_bytes: bytes, filename: str) -> dict[str, Any]:
    """Parse a document and return structured content.

    Runs blocking Docling call in a thread pool to avoid blocking the event loop.

    Returns:
        {
            "text": str,
            "page_count": int,
            "tables": int,
        }
    """
    return await asyncio.to_thread(_parse_sync, file_bytes, filename)


def chunk_text(
    text: str, chunk_size: int = 512, overlap: int = 50
) -> list[dict[str, Any]]:
    """Split text into overlapping chunks by word count.

    Returns list of dicts with 'text' and 'page' keys.
    Since we don't have page boundaries after export_to_markdown(),
    we estimate page numbers based on chunk position (roughly 3000 words per page).
    """
    if not text or not text.strip():
        return []

    words = text.split()
    if not words:
        return []

    WORDS_PER_PAGE = 3000

    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk_words = words[start:end]
        chunk_text_item = " ".join(chunk_words)
        if chunk_text_item.strip():
            estimated_page = (start // WORDS_PER_PAGE) + 1
            chunks.append(
                {
                    "text": chunk_text_item,
                    "page": estimated_page,
                }
            )
        start = end - overlap

    return chunks
