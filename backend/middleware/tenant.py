import os
import logging
from typing import Any
from functools import lru_cache

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from jose import jwt, jwk
from jose.exceptions import JWTError, JWKError
import httpx

JWT_SECRET: str = os.getenv("JWT_SECRET", "")
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_JWT_SECRET: str = os.getenv("JWT_SECRET", "")

PUBLIC_ROUTES: set[str] = {"/health", "/auth/session"}


@lru_cache(maxsize=1)
def get_jwks() -> dict:
    """Fetch and cache JWKS from Supabase"""
    try:
        jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        response = httpx.get(jwks_url, timeout=10.0)
        if response.status_code == 200:
            return response.json()
    except Exception:
        pass
    return {"keys": []}


def decode_supabase_jwt(token: str) -> dict[str, Any]:
    """Decode and verify JWT using JWKS (ES256) or legacy secret (HS256)"""

    # First, try JWKS (new ES256 keys)
    try:
        jwks = get_jwks()
        if jwks.get("keys"):
            # Get the key ID from token header
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")

            # Find matching key
            for key in jwks["keys"]:
                if key.get("kid") == kid:
                    public_key = jwk.construct(key)
                    payload = jwt.decode(
                        token,
                        public_key,
                        algorithms=["ES256"],
                        audience="authenticated",
                    )
                    return payload
    except JWTError:
        pass

    # Fallback to legacy HS256 verification
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(exc)}",
        )


async def get_auth_user(request: Request) -> dict[str, Any]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )

    token = auth_header.split(" ", 1)[1].strip()
    payload = decode_supabase_jwt(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID",
        )

    # Try to get tenant_id from JWT claims, else look up in database
    tenant_id = payload.get("user_metadata", {}).get("tenant_id") or payload.get(
        "tenant_id"
    )

    # If no tenant_id in JWT, try to get from database via user_id
    if not tenant_id:
        try:
            from services.supabase_client import get_user_tenant_id

            tenant_id = await get_user_tenant_id(str(user_id))
        except Exception as e:
            logging.getLogger(__name__).warning(f"Could not get tenant: {e}")

    role = payload.get("user_metadata", {}).get("role") or payload.get("role", "user")
    workspaces_raw = payload.get("user_metadata", {}).get("workspaces") or payload.get(
        "workspaces", []
    )

    if isinstance(workspaces_raw, str):
        workspaces = [workspaces_raw]
    elif isinstance(workspaces_raw, list):
        workspaces = workspaces_raw
    else:
        workspaces = []

    workspace_ids = [str(w) for w in workspaces]

    user_context = {
        "user_id": str(user_id),
        "email": payload.get("email"),
        "tenant_id": str(tenant_id) if tenant_id else None,
        "role": role,
        "workspaces": workspace_ids,
    }

    request.state.user = user_context
    request.state.user_id = user_context["user_id"]
    request.state.tenant_id = user_context["tenant_id"]
    request.state.role = user_context["role"]
    request.state.workspaces = user_context["workspaces"]

    return user_context


def require_tenant(request: Request) -> str:
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant context not found. User must belong to a tenant.",
        )
    return str(tenant_id)


def require_workspace_access(request: Request, workspace_id: str) -> None:
    workspaces = getattr(request.state, "workspaces", [])
    user_role = getattr(request.state, "role", "user")

    if user_role in ("admin", "super_admin"):
        return

    if str(workspace_id) not in [str(w) for w in workspaces]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this workspace.",
        )


async def tenant_middleware(request: Request, call_next: Any) -> Any:
    import logging

    logger = logging.getLogger(__name__)

    # Allow OPTIONS requests (CORS preflight) without auth
    if request.method == "OPTIONS":
        return await call_next(request)

    if request.url.path in PUBLIC_ROUTES:
        return await call_next(request)

    if (
        request.url.path.startswith("/docs")
        or request.url.path.startswith("/openapi.json")
        or request.url.path.startswith("/redoc")
    ):
        return await call_next(request)

    # Debug logging
    auth_header = request.headers.get("Authorization")
    logger.info(
        f"Request: {request.method} {request.url.path} | Auth: {auth_header[:30] + '...' if auth_header else 'NONE'}"
    )

    try:
        await get_auth_user(request)
    except HTTPException as exc:
        logger.warning(
            f"Auth failed for {request.method} {request.url.path}: {exc.detail}"
        )
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    try:
        require_tenant(request)
    except HTTPException as exc:
        logger.warning(f"Tenant required for {request.url.path}: {exc.detail}")
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    response = await call_next(request)
    return response
