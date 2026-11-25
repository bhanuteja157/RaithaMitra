"""Authenticated FastAPI router for AD-31 Offline-First Synchronization."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, Query

from backend.app.features.assistant.security import resolve_authenticated_user
from backend.app.features.finance.service import resolve_authenticated_farmer
from backend.app.features.synchronization.operation_registry import ALLOWED_OPERATIONS
from backend.app.features.synchronization.schemas import SyncOperationSubmitRequest
from backend.app.features.synchronization.service import (
    get_bounded_user_snapshot,
    list_user_sync_receipts,
    submit_sync_operation,
)

router = APIRouter(prefix="/sync", tags=["Offline Synchronization (AD-31)"])


@router.get("/status")
def get_sync_status(authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_user(authorization)
    receipts = list_user_sync_receipts(user["user_id"], limit=5)
    return {
        "backend_reachable": True,
        "user_id": user["user_id"],
        "role": user["role"],
        "server_timestamp": datetime.now(timezone.utc).isoformat(),
        "recent_receipts_count": len(receipts),
    }


@router.get("/operations")
def get_allowed_operations():
    return {"operations": ALLOWED_OPERATIONS}


@router.post("/submit")
def post_sync_operation(
    req: SyncOperationSubmitRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return submit_sync_operation(user_id=user["user_id"], role=user["role"], req=req)


@router.get("/receipts")
def get_sync_receipts(
    limit: int = Query(30, ge=1, le=100),
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_user(authorization)
    return {"receipts": list_user_sync_receipts(user["user_id"], limit=limit)}


@router.get("/snapshot")
def get_user_snapshot(
    farm_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return get_bounded_user_snapshot(user["user_id"], user["role"], farm_id)
