from fastapi import APIRouter, HTTPException, status

from models.schemas import SessionRequest, UserInfo
from services.supabase_client import (
    verify_supabase_jwt,
    get_user_workspaces,
    ensure_tenant_exists,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/session")
async def create_session(request: SessionRequest) -> UserInfo:
    try:
        user_data = await verify_supabase_jwt(request.token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )

    user_id = user_data["user_id"]
    user_metadata = user_data.get("user_metadata", {})
    app_metadata = user_data.get("app_metadata", {})

    tenant_id = user_metadata.get("tenant_id") or app_metadata.get("tenant_id")
    role = user_metadata.get("role") or app_metadata.get("role", "user")
    workspaces = user_metadata.get("workspaces", [])

    # Auto-create tenant if user doesn't have one
    if not tenant_id:
        tenant_id = await ensure_tenant_exists(str(user_id))

    # Get workspaces from database if not in metadata
    if not workspaces:
        try:
            workspaces = await get_user_workspaces(str(tenant_id), str(user_id))
        except Exception:
            workspaces = []

    return UserInfo(
        user_id=user_id,
        email=user_data.get("email"),
        tenant_id=tenant_id,
        role=role,
        workspaces=[str(w) for w in workspaces],
    )
