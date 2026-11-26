"""
AD-37: Shared Authentication, RBAC, Ownership, Rate Limiting & Upload Security Helpers.
"""
from __future__ import annotations

import os
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Any, Deque, Dict, Optional, Sequence

from fastapi import HTTPException

from backend.app.db.database import get_db_connection

DEMO_TOKEN_USER_MAP = {
    "farmer": ("usr_farmer", "Suresh Gowda"),
    "buyer": ("usr_buyer1", "Bengaluru Fresh Foods Co"),
    "labour": ("usr_labour", "Basavaraj Koravara"),
    "driver": ("usr_driver", "Manjunath Transport"),
}

MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
BLOCKED_UPLOAD_EXTENSIONS = {".exe", ".bat", ".cmd", ".sh", ".ps1", ".js", ".html", ".htm", ".svg", ".php"}
BLOCKED_UPLOAD_MIME_TYPES = {"application/x-msdownload", "application/javascript", "text/html", "image/svg+xml"}

_RATE_LOCK = threading.Lock()
_RATE_BUCKETS: Dict[str, Deque[float]] = defaultdict(deque)


def is_production_env() -> bool:
    return os.getenv("ENVIRONMENT", "development").strip().lower() == "production"


def is_demo_auth_allowed() -> bool:
    """
    Demo accounts and rm_demo_token_* shortcuts are strictly prohibited in production.
    In development/test, allowed unless DEMO_AUTH_ENABLED=false.
    """
    if is_production_env():
        return False
    flag = os.getenv("DEMO_AUTH_ENABLED", "true").strip().lower()
    return flag not in ("false", "0", "no")


def check_rate_limit(key: str, max_requests: int = 60, window_seconds: int = 60) -> None:
    """Sliding-window in-memory rate limiter for sensitive endpoints."""
    now = time.monotonic()
    cutoff = now - window_seconds
    with _RATE_LOCK:
        bucket = _RATE_BUCKETS[key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= max_requests:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please wait a moment before retrying.",
            )
        bucket.append(now)


def reset_rate_limits() -> None:
    """Clear in-memory rate limit buckets (used in isolated tests)."""
    with _RATE_LOCK:
        _RATE_BUCKETS.clear()


def resolve_authenticated_user(authorization: Optional[str]) -> Dict[str, Any]:
    """
    Validate Bearer token against user_sessions (including expiry and account_status),
    or non-production rm_demo_token_<role>.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    token = authorization.replace("Bearer ", "", 1).strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authorization token.")

    if token.startswith("rm_demo_token_"):
        if not is_demo_auth_allowed():
            raise HTTPException(
                status_code=401,
                detail="Demo authentication tokens are disabled in production.",
            )
        demo_role = token.replace("rm_demo_token_", "", 1).strip()
        if demo_role not in DEMO_TOKEN_USER_MAP:
            raise HTTPException(status_code=401, detail="Invalid demo authorization token.")
        uid, name = DEMO_TOKEN_USER_MAP[demo_role]
        return {"id": uid, "user_id": uid, "role": demo_role, "name": name, "is_demo": True}

    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT s.user_id, s.role, s.expires_at, u.name, u.email, u.account_status
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ?
            """,
            (token,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid or expired session token.")

        if row["expires_at"]:
            try:
                exp_dt = datetime.fromisoformat(row["expires_at"])
                if exp_dt.tzinfo is None:
                    exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                if exp_dt < datetime.now(timezone.utc):
                    conn.execute("DELETE FROM user_sessions WHERE token = ?", (token,))
                    conn.commit()
                    raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
            except ValueError:
                pass

        if row["account_status"] and row["account_status"] != "active":
            raise HTTPException(status_code=403, detail="User account is not active.")

        return {
            "id": row["user_id"],
            "user_id": row["user_id"],
            "role": row["role"],
            "name": row["name"],
            "email": row["email"],
            "is_demo": False,
        }
    finally:
        conn.close()


def require_roles(
    authorization: Optional[str],
    allowed_roles: Sequence[str],
    detail: Optional[str] = None,
) -> Dict[str, Any]:
    """Authenticate caller and verify their role is in allowed_roles (or admin)."""
    user = resolve_authenticated_user(authorization)
    if user["role"] != "admin" and user["role"] not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=detail or f"Unauthorized: Restricted to {', '.join(allowed_roles)} accounts.",
        )
    return user


def verify_farm_ownership_row(cursor, farm_id: str, user_id: str, role: str) -> Dict[str, Any]:
    """Ensure farm exists in SQLite and belongs to user_id (unless admin)."""
    farm = cursor.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
    if not farm:
        raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found.")
    if role != "admin" and farm["farmer_id"] != user_id:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: You cannot access or modify another farmer's farm.",
        )
    return dict(farm)


def validate_image_upload(
    filename: str,
    content_type: Optional[str],
    content: bytes,
    max_bytes: int = MAX_IMAGE_UPLOAD_BYTES,
) -> None:
    """Enforce safe image upload size and block dangerous file types."""
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty.")
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Image file exceeds maximum allowed size of {max_bytes // (1024 * 1024)} MB.",
        )
    ext = os.path.splitext((filename or "").strip().lower())[1]
    ct = (content_type or "").split(";")[0].strip().lower()
    if ext in BLOCKED_UPLOAD_EXTENSIONS or ct in BLOCKED_UPLOAD_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported or unsafe file type '{ext or ct}'. Allowed formats: JPG, JPEG, PNG, WEBP.",
        )
