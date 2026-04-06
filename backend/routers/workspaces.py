from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, status
import uuid

from models.schemas import (
    WorkspaceCreateRequest,
    WorkspaceResponse,
    WorkspaceListResponse,
)
from services.supabase_client import create_workspace_record, get_tenant_workspaces
from middleware.tenant import get_auth_user

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.post("/create", response_model=WorkspaceResponse)
async def create_workspace(
    body: WorkspaceCreateRequest,
    request: Request,
) -> WorkspaceResponse:
    user: dict[str, Any] = await get_auth_user(request)
    tenant_id = user["tenant_id"]

    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to a tenant.",
        )

    workspace_id = str(uuid.uuid4())

    try:
        record = await create_workspace_record(
            workspace_id=workspace_id,
            name=body.name,
            description=body.description,
            tenant_id=str(tenant_id),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create workspace: {str(exc)}",
        )

    return WorkspaceResponse(
        id=UUID(record.get("id", workspace_id)),
        name=record.get("name", body.name),
        description=record.get("description"),
        tenant_id=UUID(record.get("tenant_id", tenant_id)),
        created_at=record.get("created_at") or record.get("inserted_at", ""),
    )


@router.get("/", response_model=WorkspaceListResponse)
async def list_workspaces(request: Request) -> WorkspaceListResponse:
    user: dict[str, Any] = await get_auth_user(request)
    tenant_id = user["tenant_id"]

    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to a tenant.",
        )

    try:
        workspaces = await get_tenant_workspaces(str(tenant_id))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch workspaces: {str(exc)}",
        )

    workspace_list = []
    for ws in workspaces:
        workspace_list.append(
            WorkspaceResponse(
                id=UUID(ws["id"]),
                name=ws["name"],
                description=ws.get("description"),
                tenant_id=UUID(ws["tenant_id"]),
                created_at=ws.get("created_at") or ws.get("inserted_at", ""),
            )
        )

    return WorkspaceListResponse(workspaces=workspace_list)
