from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SessionRequest(BaseModel):
    token: str


class UserInfo(BaseModel):
    user_id: UUID
    email: Optional[str] = None
    tenant_id: UUID
    role: str
    workspaces: list[UUID] = Field(default_factory=list)


class WorkspaceCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None


class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    tenant_id: UUID
    created_at: datetime


class WorkspaceListResponse(BaseModel):
    workspaces: list[WorkspaceResponse]


class DocumentUploadResponse(BaseModel):
    document_id: UUID
    filename: str
    status: str
    workspace_id: UUID
    uploaded_at: datetime


class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    workspace_id: UUID
    tenant_id: UUID
    status: str
    chunk_count: int
    file_size: int
    uploaded_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]


class ChatRequest(BaseModel):
    workspace_id: UUID
    message: str
    session_id: Optional[str] = None


class Citation(BaseModel):
    document_id: UUID
    filename: str
    chunk_text: str
    score: float


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    citations: list[Citation]
    model: str


class ChatMessage(BaseModel):
    id: Optional[str] = None
    role: str
    content: str
    created_at: Optional[datetime] = None


class ChatSession(BaseModel):
    session_id: str
    workspace_id: UUID
    messages: list[ChatMessage]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ChatHistoryResponse(BaseModel):
    sessions: list[ChatSession]


class HealthStatus(BaseModel):
    service: str
    status: str
    details: Optional[str] = None


class HealthResponse(BaseModel):
    backend: str
    redis: HealthStatus
    qdrant: HealthStatus
    neo4j: HealthStatus
    supabase: HealthStatus
    embedding: HealthStatus
